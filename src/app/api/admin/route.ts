import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. Manejo de subida de imágenes multipart/form-data
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createServerClient() as any;

      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const hasBucket = buckets?.some((b: any) => b.name === "product-images");
        if (!hasBucket) {
          await supabase.storage.createBucket("product-images", {
            public: true,
            fileSizeLimit: 10485760,
          });
        }
      } catch (bucketErr) {
        console.warn("Aviso revisando/creando bucket:", bucketErr);
      }

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 20);
      const fileName = `products/${Date.now()}-${cleanName}.${fileExt}`;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, buffer, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error("Error subiendo a Supabase Storage:", uploadError);
        const base64 = buffer.toString("base64");
        const dataUrl = `data:${file.type || "image/jpeg"};base64,${base64}`;
        return NextResponse.json({ success: true, url: dataUrl });
      }

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      return NextResponse.json({ success: true, url: publicUrlData.publicUrl });
    }

    // 2. JSON actions
    const body = await req.json();
    const { action, id, email, password, product, batch } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    // Subida de imagen desde URL remota o Data URL (Copiada y pegada / Búsqueda web)
    if (action === "upload_image_url") {
      const { imageUrl } = body;
      if (!imageUrl || typeof imageUrl !== "string") {
        return NextResponse.json({ error: "imageUrl requerida" }, { status: 400 });
      }

      try {
        let buffer: Buffer;
        let mimeType = "image/jpeg";
        let extension = "jpg";

        if (imageUrl.startsWith("data:")) {
          const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            mimeType = matches[1];
            extension = mimeType.split("/")[1] || "jpg";
            buffer = Buffer.from(matches[2], "base64");
          } else {
            return NextResponse.json({ success: true, url: imageUrl });
          }
        } else {
          // Descargar la imagen de la URL externa
          const imgRes = await fetch(imageUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          });
          if (!imgRes.ok) {
            // Si el servidor de la imagen bloquea la descarga, usamos directamente la URL externa
            return NextResponse.json({ success: true, url: imageUrl });
          }
          const arrayBuf = await imgRes.arrayBuffer();
          buffer = Buffer.from(arrayBuf);
          const ct = imgRes.headers.get("content-type");
          if (ct && ct.startsWith("image/")) {
            mimeType = ct;
            extension = ct.split("/")[1]?.split(";")[0] || "jpg";
          }
        }

        const fileName = `products/${Date.now()}-web-${Math.floor(1000 + Math.random() * 9000)}.${extension}`;
        
        try {
          const { data: buckets } = await supabase.storage.listBuckets();
          const hasBucket = buckets?.some((b: any) => b.name === "product-images");
          if (!hasBucket) {
            await supabase.storage.createBucket("product-images", {
              public: true,
              fileSizeLimit: 10485760,
            });
          }
        } catch {}

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadError) {
          console.warn("Storage fallback to direct url/data:", uploadError);
          return NextResponse.json({ success: true, url: imageUrl });
        }

        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        return NextResponse.json({ success: true, url: publicUrlData.publicUrl });
      } catch (err: any) {
        console.warn("Error procesando imagen remota, fallback a url original:", err);
        return NextResponse.json({ success: true, url: imageUrl });
      }
    }

    // ─── GENERACIÓN / HOMOGENEIZACIÓN DE IMAGEN CON IA (ESTILO ESTUDIO FOXDROP) ────
    if (action === "generate_ai_image") {
      const { title, category, inputImage } = body;
      if (!title || typeof title !== "string") {
        return NextResponse.json({ error: "Título del producto requerido" }, { status: 400 });
      }

      let imageBuffer: Buffer | null = null;
      let mimeType = "image/png";

      // ── MODO 1: SI EL USUARIO YA SUBIÓ O PEGÓ UNA FOTO REAL DEL PRODUCTO ──
      // Extraemos el objeto real y le colocamos el fondo de estudio neutro homogéneo
      if (inputImage && typeof inputImage === "string" && inputImage.trim().length > 0) {
        try {
          // Si inputImage es URL remota o Data URL, procesamos la extracción de fondo
          // Usamos el servicio de recorte inteligente sin alterar la forma ni los colores del producto
          const cleanInputUrl = inputImage.trim();
          const removeBgEndpoint = `https://api.remove.bg/v1.0/removebg`;
          
          // Fallback a motor público de extracción de fondo transparente de alta fidelidad
          const extractUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(`Product cutout of ${title.trim()}, isolated on clean light grey solid studio background #f3f4f6, subtle floor shadow, centered e-commerce catalog photography`)}?image=${encodeURIComponent(cleanInputUrl)}&nologo=true&width=800&height=800`;
          
          const remRes = await fetch(extractUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            }
          });

          if (remRes.ok) {
            const arrBuf = await remRes.arrayBuffer();
            imageBuffer = Buffer.from(arrBuf);
            mimeType = remRes.headers.get("content-type") || "image/png";
          }
        } catch (cutErr) {
          console.warn("Fallo en recorte inteligente, usando fallback:", cutErr);
        }
      }

      // ── MODO 2: GENERACIÓN DESDE CERO (SI NO HAY FOTO DE REFERENCIA) ──
      if (!imageBuffer) {
        const apiKey = process.env.GEMINI_API_KEY || "";
        const visualPrompt = `Professional commercial studio product photography of: ${title.trim()}, category ${category || 'electronics'}. Centered hero composition, seamless clean minimalist light neutral grey studio backdrop (#f3f4f6), soft diffused dual-light studio illumination, elegant subtle ground contact shadow, ultra-realistic textures, 4k sharp details, premium e-commerce look, no watermarks, no background clutter, no text.`;

        // Intento con Google Gemini / Imagen 3
        if (apiKey && apiKey.length > 10) {
          try {
            const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
            const geminiRes = await fetch(geminiEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                instances: [{ prompt: visualPrompt }],
                parameters: {
                  sampleCount: 1,
                  aspectRatio: "1:1",
                  outputOptions: { mimeType: "image/jpeg" }
                }
              })
            });

            if (geminiRes.ok) {
              const geminiJson = await geminiRes.json();
              const b64 = geminiJson.predictions?.[0]?.bytesBase64Encoded;
              if (b64) {
                imageBuffer = Buffer.from(b64, "base64");
                mimeType = "image/jpeg";
              }
            }
          } catch (gemErr) {
            console.warn("Fallo llamando a Google Imagen API:", gemErr);
          }
        }

        // Intento con motor de alta resolución FLUX
        if (!imageBuffer) {
          try {
            const seed = Math.floor(100000 + Math.random() * 900000);
            const fluxUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(visualPrompt)}?width=800&height=800&seed=${seed}&nologo=true&enhance=true&model=flux`;
            
            const fluxRes = await fetch(fluxUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
            });

            if (fluxRes.ok) {
              const arrBuf = await fluxRes.arrayBuffer();
              imageBuffer = Buffer.from(arrBuf);
              mimeType = fluxRes.headers.get("content-type") || "image/jpeg";
            }
          } catch (fluxErr) {
            console.error("Error en motor alternativo de IA:", fluxErr);
          }
        }
      }

      if (!imageBuffer) {
        return NextResponse.json({ error: "No fue posible procesar la imagen con IA." }, { status: 500 });
      }

      // Guardar la imagen generada en Supabase Storage
      const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 15);
      const ext = mimeType.includes("png") ? "png" : "jpg";
      const fileName = `products/studio-${Date.now()}-${cleanTitle}.${ext}`;

      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const hasBucket = buckets?.some((b: any) => b.name === "product-images");
        if (!hasBucket) {
          await supabase.storage.createBucket("product-images", {
            public: true,
            fileSizeLimit: 10485760,
          });
        }
      } catch {}

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, imageBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        const dataUrl = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
        return NextResponse.json({ success: true, url: dataUrl });
      }

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      return NextResponse.json({ success: true, url: publicUrlData.publicUrl });
    }

    // ─── CONSULTAS GLOBALES (BYPASS RLS PARA COMPARTIR ENTRE TODOS) ───
    if (action === "get_products") {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(id, name, slug, icon)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
    }

    if (action === "get_categories") {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
    }

    if (action === "create_category") {
      const { name } = body;
      if (!name || !name.trim()) {
        return NextResponse.json({ error: "Nombre de categoría requerido" }, { status: 400 });
      }
      const catTrimmed = name.trim();
      const slug = catTrimmed.toLowerCase().replace(/[^a-z0-9]/g, "-") || "cat";

      // Verificar si ya existe
      const { data: existing } = await supabase
        .from("categories")
        .select("*")
        .ilike("name", catTrimmed)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ success: true, data: existing });
      }

      const { data, error } = await supabase
        .from("categories")
        .insert([{ name: catTrimmed, slug, is_active: true }])
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "get_batches") {
      const { data, error } = await supabase
        .from("import_batches")
        .select("*")
        .order("received_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
    }

    if (action === "get_orders") {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
    }

    if (action === "get_clients") {
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: orders, error: ordErr } = await supabase
        .from("orders")
        .select("id, client_name, client_phone, client_email, total, status, created_at");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientMap = new Map<string, any>();

      (profiles || []).forEach((p: any) => {
        const key = (p.phone || p.email || p.id).trim().toLowerCase();
        if (!clientMap.has(key)) {
          clientMap.set(key, {
            id: p.id,
            name: p.full_name || "Cliente FoxDrop",
            phone: p.phone || "Sin teléfono",
            email: p.email || "Sin correo",
            role: p.role || "client",
            loyaltyPoints: p.loyalty_points || 0,
            ordersCount: 0,
            totalSpent: 0,
            registeredAt: p.created_at,
            orders: [],
          });
        }
      });

      (orders || []).forEach((o: any) => {
        const key = (o.client_phone || o.client_email || "").trim().toLowerCase();
        if (!key) return;

        if (!clientMap.has(key)) {
          clientMap.set(key, {
            id: `cli-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: o.client_name || "Cliente",
            phone: o.client_phone || "Sin teléfono",
            email: o.client_email || "Sin correo",
            role: "client",
            loyaltyPoints: Math.floor((Number(o.total) || 0) / 10),
            ordersCount: 0,
            totalSpent: 0,
            registeredAt: o.created_at,
            orders: [],
          });
        }

        const client = clientMap.get(key);
        client.ordersCount += 1;
        if (o.status !== "cancelled") {
          client.totalSpent += Number(o.total) || 0;
        }
        client.orders.push(o);
      });

      return NextResponse.json({ success: true, data: Array.from(clientMap.values()) });
    }

    if (action === "get_special_orders") {
      const { data, error } = await supabase
        .from("special_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
    }

    // ─── PRODUCTOS ───────────────────────────────────────────────
    if (action === "create_product") {
      if (!product || !product.title) {
        return NextResponse.json({ error: "Datos de producto incompletos" }, { status: 400 });
      }

      let categoryId: string | null = null;
      if (product.categoryName) {
        const catTrimmed = product.categoryName.trim();
        let { data: catData } = await supabase
          .from("categories")
          .select("id")
          .ilike("name", catTrimmed)
          .maybeSingle();

        if (!catData?.id) {
          const slug = catTrimmed.toLowerCase().replace(/[^a-z0-9]/g, "-") || "cat";
          const { data: newCat } = await supabase
            .from("categories")
            .insert([{ name: catTrimmed, slug }])
            .select("id")
            .maybeSingle();
          catData = newCat;
        }

        categoryId = catData?.id || null;
      }

      const sku = product.sku || `FX-${Math.floor(1000 + Math.random() * 9000)}`;

      const { data, error } = await supabase
        .from("products")
        .insert([
          {
            sku,
            title: product.title,
            description: "Artículo verificado por FoxDrop.",
            category_id: categoryId,
            base_cost_usd: product.baseCostUsd || 0,
            base_cost_mxn: product.baseCostMxn || 0,
            shipping_cost_allocated: product.shippingCostAllocated || 0,
            public_price: product.publicPrice || 0,
            stock: product.stock ?? 0,
            images: product.imageUrl ? [product.imageUrl] : ["https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800"],
            is_active: true,
          },
        ])
        .select("*, categories(id, name, slug, icon)")
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "update_product") {
      if (!id || !product) {
        return NextResponse.json({ error: "ID y datos requeridos" }, { status: 400 });
      }

      const payload: any = { updated_at: new Date().toISOString() };
      if (product.title !== undefined) payload.title = product.title;
      if (product.sku !== undefined) payload.sku = product.sku;
      if (product.baseCostUsd !== undefined) payload.base_cost_usd = product.baseCostUsd;
      if (product.baseCostMxn !== undefined) payload.base_cost_mxn = product.baseCostMxn;
      if (product.shippingCostAllocated !== undefined) payload.shipping_cost_allocated = product.shippingCostAllocated;
      if (product.publicPrice !== undefined) payload.public_price = product.publicPrice;
      if (product.stock !== undefined) payload.stock = product.stock;
      if (product.imageUrl) payload.images = [product.imageUrl];

      if (product.categoryName) {
        const catTrimmed = product.categoryName.trim();
        let { data: catData } = await supabase
          .from("categories")
          .select("id")
          .ilike("name", catTrimmed)
          .maybeSingle();

        if (!catData?.id) {
          const slug = catTrimmed.toLowerCase().replace(/[^a-z0-9]/g, "-") || "cat";
          const { data: newCat } = await supabase
            .from("categories")
            .insert([{ name: catTrimmed, slug }])
            .select("id")
            .maybeSingle();
          catData = newCat;
        }

        if (catData?.id) {
          payload.category_id = catData.id;
        }
      }

      const { data, error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", id)
        .select("*, categories(id, name, slug, icon)")
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "delete_product") {
      if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true, deletedId: id });
    }

    if (action === "delete_all_mock_products") {
      const { error } = await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      return NextResponse.json({ success: true, message: "Todos los productos eliminados de la base de datos." });
    }

    if (action === "delete_order") {
      const { orderId } = body;
      if (!orderId) return NextResponse.json({ error: "orderId requerido" }, { status: 400 });

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);

      // Buscar el id real de la orden si es order_number
      let realOrderId = orderId;
      if (!isUuid) {
        const { data: foundOrder } = await supabase
          .from("orders")
          .select("id")
          .eq("order_number", orderId)
          .maybeSingle();
        if (foundOrder?.id) {
          realOrderId = foundOrder.id;
        }
      }

      // Borrar items asociados primero
      await supabase
        .from("order_items")
        .delete()
        .eq("order_id", realOrderId);

      // Borrar la orden
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", realOrderId);

      if (error && !isUuid) {
        await supabase.from("orders").delete().eq("order_number", orderId);
      }

      return NextResponse.json({ success: true, deletedOrderId: orderId });
    }

    if (action === "update_order_status") {
      const { orderId, status, notes } = body;
      if (!orderId || !status) {
        return NextResponse.json({ error: "orderId y status requeridos" }, { status: 400 });
      }

      const updatePayload: any = { status, updated_at: new Date().toISOString() };
      if (notes !== undefined) {
        updatePayload.notes = notes;
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);

      let updateQuery;
      if (isUuid) {
        updateQuery = supabase.from("orders").update(updatePayload).eq("id", orderId);
      } else {
        updateQuery = supabase.from("orders").update(updatePayload).eq("order_number", orderId);
      }

      const { data, error } = await updateQuery.select().maybeSingle();

      if (error || !data) {
        // Fallback: intentar por el otro campo por si acaso
        const fallbackQuery = isUuid
          ? supabase.from("orders").update(updatePayload).eq("order_number", orderId)
          : supabase.from("orders").update(updatePayload).eq("id", orderId);
        const { data: fallbackData, error: fallbackError } = await fallbackQuery.select().maybeSingle();

        if (fallbackError) {
          console.error("Error al actualizar estado en Supabase:", fallbackError);
          return NextResponse.json({ error: fallbackError.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, data: fallbackData });
      }

      return NextResponse.json({ success: true, data });
    }

    // ─── LOTES DE IMPORTACIÓN ─────────────────────────────────────
    if (action === "create_batch") {
      if (!batch || !batch.batchName) {
        return NextResponse.json({ error: "Datos de lote requeridos" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("import_batches")
        .insert([
          {
            batch_name: batch.batchName,
            total_shipping_cost: batch.totalShippingCost || 0,
            total_units: batch.totalUnits || 1,
            notes: batch.notes || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "delete_batch") {
      if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
      const { error } = await supabase.from("import_batches").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true, deletedId: id });
    }

    // ─── AUTH ADMIN CON PERSISTENCIA MULTIDISPOSITIVO ────────────
    if (action === "update_password") {
      if (!email || !password) {
        return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
      }

      const normalizedEmail = email.trim().toLowerCase();
      
      // 1. Cargar diccionario de credenciales actual desde Supabase Storage
      let credsDict: Record<string, { password: string; mustChangePassword: boolean; updatedAt: string }> = {};
      try {
        const { data: fileData } = await supabase.storage
          .from("product-images")
          .download("_system/admin_passwords.json");
        if (fileData) {
          const rawText = await fileData.text();
          credsDict = JSON.parse(rawText || "{}");
        }
      } catch (readErr) {
        console.warn("Inicializando nuevo almacén de credenciales admin:", readErr);
      }

      // 2. Actualizar contraseña y quitar flag de cambio obligatorio
      credsDict[normalizedEmail] = {
        password: password.trim(),
        mustChangePassword: false,
        updatedAt: new Date().toISOString(),
      };

      // 3. Guardar de forma persistente en Supabase
      const { error: saveError } = await supabase.storage
        .from("product-images")
        .upload("_system/admin_passwords.json", Buffer.from(JSON.stringify(credsDict, null, 2)), {
          contentType: "application/json",
          upsert: true,
        });

      if (saveError) {
        console.error("Error guardando credenciales en Supabase:", saveError);
        throw saveError;
      }

      return NextResponse.json({ success: true, email: normalizedEmail, mustChangePassword: false });
    }

    if (action === "verify_password") {
      if (!email || !password) {
        return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
      }

      const normalizedEmail = email.trim().toLowerCase();
      
      try {
        const { data: fileData } = await supabase.storage
          .from("product-images")
          .download("_system/admin_passwords.json");

        if (fileData) {
          const rawText = await fileData.text();
          const credsDict = JSON.parse(rawText || "{}");
          const userCred = credsDict[normalizedEmail];

          if (userCred && userCred.password) {
            if (userCred.password === password.trim()) {
              return NextResponse.json({
                valid: true,
                mustChangePassword: Boolean(userCred.mustChangePassword),
              });
            } else {
              return NextResponse.json({ valid: false });
            }
          }
        }
      } catch (err) {
        console.warn("No se pudo leer almacén de credenciales:", err);
      }

      return NextResponse.json({ valid: null });
    }

    // ─── CARRUSEL HERO ───────────────────────────────────────────
    if (action === "delete_slide") {
      if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
      const { error } = await supabase.from("carousel_slides").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true, deletedId: id });
    }

    if (action === "create_slide") {
      const { slide } = body;
      const { data, error } = await supabase.from("carousel_slides").insert([slide]).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "get_slides") {
      const { data, error } = await supabase
        .from("carousel_slides")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) {
        return NextResponse.json({ success: true, data: [] });
      }
      return NextResponse.json({ success: true, data: data || [] });
    }

    // ─── CARRITOS ABANDONADOS ────────────────────────────────────
    if (action === "get_abandoned_carts") {
      const { data, error } = await supabase
        .from("abandoned_carts")
        .select("*")
        .order("last_active", { ascending: false });

      if (error) {
        console.warn("Error consultando carritos abandonados:", error);
        return NextResponse.json({ success: true, data: [] });
      }

      const mapped = (data || []).map((c: any) => ({
        id: c.id,
        clientName: c.client_name || "Cliente Invitado",
        clientPhone: c.client_phone || "",
        clientEmail: c.client_email || undefined,
        items: Array.isArray(c.items) ? c.items : [],
        total: Number(c.total) || 0,
        lastActive: c.last_active || c.created_at,
        followedUp: Boolean(c.followed_up),
        createdAt: c.created_at,
      }));

      return NextResponse.json({ success: true, data: mapped });
    }

    if (action === "update_abandoned_cart") {
      const { cartId, followedUp } = body;
      if (!cartId) return NextResponse.json({ error: "cartId requerido" }, { status: 400 });

      const { data, error } = await supabase
        .from("abandoned_carts")
        .update({ followed_up: Boolean(followedUp) })
        .eq("id", cartId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "delete_abandoned_cart") {
      if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
      const { error } = await supabase.from("abandoned_carts").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true, deletedId: id });
    }

    if (action === "create_test_abandoned_cart") {
      const sampleItems = [
        { title: "Kit Cosméticos Coreanos Fox Glow", quantity: 1, price: 349, image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80" },
        { title: "Llavero Edición Especial FoxDrop", quantity: 2, price: 89, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80" }
      ];
      const { data, error } = await supabase
        .from("abandoned_carts")
        .insert([
          {
            client_name: "Mariana Soto",
            client_phone: "2221234567",
            client_email: "mariana.soto@ejemplo.com",
            items: sampleItems,
            total: 527.00,
            followed_up: false,
            last_active: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    // ─── CONFIGURACIÓN PROGRAMA DE MIEMBROS & FIDELIDAD ────────────
    if (action === "get_club_settings") {
      try {
        const { data: fileData } = await supabase.storage
          .from("product-images")
          .download("_system/club_settings.json");

        if (fileData) {
          const rawText = await fileData.text();
          const parsed = JSON.parse(rawText || "{}");
          if (parsed && parsed.tiers && parsed.tiers.length > 0) {
            return NextResponse.json({ success: true, settings: parsed });
          }
        }
      } catch (err) {
        console.warn("Aviso: club_settings.json aún no configurado en storage, devolviendo default:", err);
      }

      const defaultSettings = {
        currencyName: "Estrellas",
        currencySymbol: "⭐",
        pesosPerPoint: 10,
        pointMonetaryValueMxn: 0.10,
        tiers: [
          { name: "Miembro Bronce", minPoints: 0, discountPercent: 0, badge: "🥉" },
          { name: "Miembro Plata", minPoints: 500, discountPercent: 3, badge: "🥈" },
          { name: "Miembro Oro", minPoints: 1500, discountPercent: 7, badge: "🥇" },
          { name: "Miembro Platino Fox", minPoints: 3000, discountPercent: 12, badge: "👑" },
        ],
      };
      return NextResponse.json({ success: true, settings: defaultSettings });
    }

    if (action === "save_club_settings") {
      const { settings } = body;
      if (!settings || !Array.isArray(settings.tiers)) {
        return NextResponse.json({ error: "Configuración inválida" }, { status: 400 });
      }

      const buffer = Buffer.from(JSON.stringify(settings, null, 2));
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload("_system/club_settings.json", buffer, {
          contentType: "application/json",
          upsert: true,
        });

      if (uploadError) {
        console.error("Error guardando club_settings en Supabase:", uploadError);
        throw uploadError;
      }

      return NextResponse.json({ success: true, settings });
    }

    // ─── CONFIGURACIÓN DE ENVÍOS & DATOS DE TRANSFERENCIA (CHECKOUT) ────────────
    if (action === "get_checkout_settings") {
      try {
        const { data: fileData } = await supabase.storage
          .from("product-images")
          .download("_system/checkout_settings.json");

        if (fileData) {
          const rawText = await fileData.text();
          const parsed = JSON.parse(rawText || "{}");
          if (parsed && Array.isArray(parsed.shippingMethods)) {
            return NextResponse.json({ success: true, settings: parsed });
          }
        }
      } catch (err) {
        console.warn("checkout_settings.json no encontrado, usando defaults:", err);
      }

      const defaultSettings = {
        shippingMethods: [
          {
            id: 'pickup',
            name: 'Acordar con el vendedor (Entrega Personal)',
            description: 'Punto de encuentro personal en Puebla o coordinar por WhatsApp (Sin costo)',
            price: 0,
            requiresAddress: false,
            enabled: true,
          },
          {
            id: 'local_puebla',
            name: 'Envío Local (Puebla y alrededores)',
            description: 'Entrega por mensajería local a domicilio',
            price: 50,
            requiresAddress: true,
            enabled: true,
          },
          {
            id: 'national',
            name: 'Envío Nacional por Paquetería',
            description: 'Guía de rastreo nacional a cualquier estado de la República (FedEx/Estafeta/DHL)',
            price: 140,
            requiresAddress: true,
            enabled: true,
          },
        ],
        bankTransfer: {
          bankName: 'BBVA México',
          accountHolder: 'FoxDrop México',
          clabe: '012680015948372619',
          accountNumber: '1594837261',
          notes: 'Realiza tu transferencia desde tu aplicación bancaria. Envía tu captura de pantalla por WhatsApp para despachar tu paquete de inmediato.',
        },
        allowCashOnDelivery: true,
      };

      return NextResponse.json({ success: true, settings: defaultSettings });
    }

    if (action === "save_checkout_settings") {
      const { settings } = body;
      if (!settings || !Array.isArray(settings.shippingMethods)) {
        return NextResponse.json({ error: "Configuración inválida" }, { status: 400 });
      }

      const buffer = Buffer.from(JSON.stringify(settings, null, 2));
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload("_system/checkout_settings.json", buffer, {
          contentType: "application/json",
          upsert: true,
        });

      if (uploadError) {
        console.error("Error guardando checkout_settings en Supabase:", uploadError);
        throw uploadError;
      }

      return NextResponse.json({ success: true, settings });
    }

    // ─── MÉTRICAS DE FIDELIDAD & INVERSIÓN AL CLIENTE ─────────────
    if (action === "get_loyalty_metrics") {
      try {
        // 1. Perfiles y puntos en circulación
        const { data: profiles, error: pError } = await supabase
          .from("profiles")
          .select("id, full_name, loyalty_points, created_at");

        if (pError) console.warn("Error perfiles para métricas:", pError);

        // 2. Pedidos y descuentos otorgados
        const { data: orders, error: oError } = await supabase
          .from("orders")
          .select("id, subtotal, shipping_cost, total, status, created_at");

        if (oError) console.warn("Error orders para métricas:", oError);

        // 3. Descargar configuración actual de tiers
        let tiers = [
          { name: "Miembro Bronce", minPoints: 0, discountPercent: 0, badge: "🥉" },
          { name: "Miembro Plata", minPoints: 500, discountPercent: 3, badge: "🥈" },
          { name: "Miembro Oro", minPoints: 1500, discountPercent: 7, badge: "🥇" },
          { name: "Miembro Platino Fox", minPoints: 3000, discountPercent: 12, badge: "👑" },
        ];
        let pointMonetaryValueMxn = 0.10;

        try {
          const { data: fileData } = await supabase.storage
            .from("product-images")
            .download("_system/club_settings.json");
          if (fileData) {
            const raw = JSON.parse(await fileData.text() || "{}");
            if (raw.tiers) tiers = raw.tiers;
            if (raw.pointMonetaryValueMxn) pointMonetaryValueMxn = Number(raw.pointMonetaryValueMxn);
          }
        } catch {}

        let totalCirculatingPoints = 0;
        const tierCounts = { bronze: 0, silver: 0, gold: 0, platinum: 0 };

        (profiles || []).forEach((p: any) => {
          const pts = Number(p.loyalty_points) || 0;
          totalCirculatingPoints += pts;

          const sortedTiers = [...tiers].sort((a, b) => b.minPoints - a.minPoints);
          const currentTier = sortedTiers.find(t => pts >= t.minPoints) || sortedTiers[sortedTiers.length - 1];

          const tName = (currentTier?.name || "").toLowerCase();
          if (tName.includes("platino")) tierCounts.platinum++;
          else if (tName.includes("oro")) tierCounts.gold++;
          else if (tName.includes("plata")) tierCounts.silver++;
          else tierCounts.bronze++;
        });

        // Calcular descuentos otorgados en pedidos
        let totalLoyaltyDiscountGiven = 0;
        (orders || []).forEach((o: any) => {
          const expectedTotal = (Number(o.subtotal) || 0) + (Number(o.shipping_cost) || 0);
          const actualTotal = Number(o.total) || 0;
          const diff = expectedTotal - actualTotal;
          if (diff > 0.01) {
            totalLoyaltyDiscountGiven += diff;
          }
        });

        const metrics = {
          totalClients: (profiles || []).length,
          totalCirculatingPoints,
          pointMonetaryValueMxn,
          circulatingLiabilityMxn: Number((totalCirculatingPoints * pointMonetaryValueMxn).toFixed(2)),
          totalLoyaltyDiscountGiven: Number(totalLoyaltyDiscountGiven.toFixed(2)),
          tierCounts,
          totalOrdersAnalyzed: (orders || []).length,
        };

        return NextResponse.json({ success: true, metrics });
      } catch (err: any) {
        console.error("Error calculando loyalty metrics:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (err: any) {
    console.error("Error en /api/admin:", err);
    return NextResponse.json({ error: err.message || "Error interno del servidor" }, { status: 500 });
  }
}
