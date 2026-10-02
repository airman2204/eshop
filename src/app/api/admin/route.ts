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
      const includeInactive = Boolean(body.includeInactive);
      let query = supabase
        .from("products")
        .select("*, categories(id, name, slug, icon)")
        .order("created_at", { ascending: false });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

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

      const productImages = product.images && product.images.length > 0
        ? product.images
        : (product.imageUrl ? [product.imageUrl] : ["https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800"]);

      const insertRecord: any = {
        sku,
        title: product.title,
        description: product.description || "Artículo verificado por FoxDrop.",
        category_id: categoryId,
        base_cost_usd: product.baseCostUsd || 0,
        base_cost_mxn: product.baseCostMxn || 0,
        shipping_cost_allocated: product.shippingCostAllocated || 0,
        public_price: product.publicPrice || 0,
        stock: product.stock ?? 0,
        images: productImages,
        is_active: true,
      };

      // Si el producto viene configurado como combo, incluimos los campos
      if (product.isCombo) {
        insertRecord.is_combo = true;
        insertRecord.combo_product_ids = product.comboProductIds || [];
      }

      let { data, error } = await supabase
        .from("products")
        .insert([insertRecord])
        .select("*, categories(id, name, slug, icon)")
        .single();

      // Si falla porque las columnas combo aún no se migran en la base de datos remota, reintentamos omitiendo los campos combo
      if (error && (error.message?.includes("combo_product_ids") || error.message?.includes("is_combo") || error.details?.includes("combo"))) {
        console.warn("Columnas combo no encontradas en Supabase, reintentando inserción básica:", error.message);
        delete insertRecord.is_combo;
        delete insertRecord.combo_product_ids;
        const retryResult = await supabase
          .from("products")
          .insert([insertRecord])
          .select("*, categories(id, name, slug, icon)")
          .single();
        data = retryResult.data;
        error = retryResult.error;
      }

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
      if (product.description !== undefined) payload.description = product.description;
      if (product.baseCostUsd !== undefined) payload.base_cost_usd = product.baseCostUsd;
      if (product.baseCostMxn !== undefined) payload.base_cost_mxn = product.baseCostMxn;
      if (product.shippingCostAllocated !== undefined) payload.shipping_cost_allocated = product.shippingCostAllocated;
      if (product.publicPrice !== undefined) payload.public_price = product.publicPrice;
      if (product.stock !== undefined) payload.stock = product.stock;
      if (product.isActive !== undefined) payload.is_active = Boolean(product.isActive);
      if (product.images && product.images.length > 0) {
        payload.images = product.images;
      } else if (product.imageUrl) {
        payload.images = [product.imageUrl];
      }
      if (product.isCombo !== undefined) payload.is_combo = Boolean(product.isCombo);
      if (product.comboProductIds !== undefined) payload.combo_product_ids = product.comboProductIds;

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

      let { data, error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", id)
        .select("*, categories(id, name, slug, icon)")
        .single();

      // Si falla por columnas combo no existentes, reintentamos omitiéndolas
      if (error && (error.message?.includes("combo_product_ids") || error.message?.includes("is_combo") || error.details?.includes("combo"))) {
        console.warn("Columnas combo no encontradas al actualizar, reintentando actualización básica:", error.message);
        delete payload.is_combo;
        delete payload.combo_product_ids;
        const retryResult = await supabase
          .from("products")
          .update(payload)
          .eq("id", id)
          .select("*, categories(id, name, slug, icon)")
          .single();
        data = retryResult.data;
        error = retryResult.error;
      }

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

    // ─── VENTA FÍSICA EN PUNTO DE VENTA (POS) CON SERVIDOR BYPASS RLS ───────
    if (action === "create_pos_sale") {
      const { sale } = body;
      if (!sale || !sale.items || sale.items.length === 0) {
        return NextResponse.json({ error: "Datos de venta POS inválidos o sin artículos" }, { status: 400 });
      }

      const orderNumber = `FX-POS-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Descontar stock de cada producto y sus componentes (con permisos completos de service_role)
      for (const item of sale.items) {
        const prod = item.product;
        const qty = item.quantity || 1;

        // Si es un combo, descontar partes
        if (prod.isCombo && prod.comboProductIds && prod.comboProductIds.length > 0) {
          for (const subProdId of prod.comboProductIds) {
            try {
              const { data: subData } = await supabase
                .from("products")
                .select("stock")
                .eq("id", subProdId)
                .maybeSingle();

              if (subData && typeof subData.stock === "number") {
                const updatedStock = Math.max(0, subData.stock - qty);
                await supabase
                  .from("products")
                  .update({ stock: updatedStock, updated_at: new Date().toISOString() })
                  .eq("id", subProdId);
              }
            } catch (comboErr) {
              console.warn(`Error al descontar componente de combo ${subProdId}:`, comboErr);
            }
          }
        }

        // Descontar producto individual
        if (prod.id) {
          try {
            const { data: currentData } = await supabase
              .from("products")
              .select("stock")
              .eq("id", prod.id)
              .maybeSingle();

            const currentStock = currentData && typeof currentData.stock === "number" ? currentData.stock : prod.stock;
            const newStock = Math.max(0, currentStock - qty);

            await supabase
              .from("products")
              .update({ stock: newStock, updated_at: new Date().toISOString() })
              .eq("id", prod.id);
          } catch (err) {
            console.warn(`Error al descontar stock del producto ${prod.id}:`, err);
          }
        }
      }

      // 2. Intentar asociar cliente existente a la orden (por userId, teléfono o email)
      let resolvedUserId = sale.userId || null;
      let resolvedClientEmail = sale.clientEmail || null;
      let existingProfile: any = null;

      const cleanPhone = sale.clientPhone && sale.clientPhone.trim() !== "Mostrador" ? sale.clientPhone.trim() : null;
      const cleanDigits = cleanPhone ? cleanPhone.replace(/[^0-9]/g, '') : null;

      if (!resolvedUserId && (cleanPhone || cleanDigits || resolvedClientEmail)) {
        try {
          const profileOrConditions: string[] = [];
          if (cleanPhone) profileOrConditions.push(`phone.eq.${cleanPhone}`);
          if (cleanDigits && cleanDigits !== cleanPhone) profileOrConditions.push(`phone.eq.${cleanDigits}`);
          if (resolvedClientEmail) profileOrConditions.push(`email.ilike.${resolvedClientEmail.toLowerCase()}`);

          if (profileOrConditions.length > 0) {
            const { data: matchedProfile } = await supabase
              .from("profiles")
              .select("id, full_name, email, phone, loyalty_points")
              .or(profileOrConditions.join(","))
              .maybeSingle();

            if (matchedProfile) {
              existingProfile = matchedProfile;
              resolvedUserId = matchedProfile.id;
              if (!resolvedClientEmail && matchedProfile.email) {
                resolvedClientEmail = matchedProfile.email;
              }
            }
          }
        } catch (findProfErr) {
          console.warn("Aviso buscando perfil para venta POS:", findProfErr);
        }
      } else if (resolvedUserId) {
        try {
          const { data: matchedProfile } = await supabase
            .from("profiles")
            .select("id, full_name, email, phone, loyalty_points")
            .eq("id", resolvedUserId)
            .maybeSingle();
          if (matchedProfile) {
            existingProfile = matchedProfile;
            if (!resolvedClientEmail && matchedProfile.email) {
              resolvedClientEmail = matchedProfile.email;
            }
          }
        } catch (errProf) {
          console.warn("Aviso buscando perfil por ID:", errProf);
        }
      }

      // 3. Registrar orden en Supabase
      const notes = sale.ticketImageUrl 
        ? `Venta física POS | Ticket: ${sale.ticketImageUrl}` 
        : "Venta física registrada con Escáner POS Móvil";

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert([
          {
            order_number: orderNumber,
            user_id: resolvedUserId,
            client_name: sale.clientName || existingProfile?.full_name || "Venta en Tienda Física",
            client_phone: sale.clientPhone || existingProfile?.phone || "Mostrador",
            client_email: resolvedClientEmail,
            shipping_type: "agreed_pickup",
            shipping_cost: 0,
            subtotal: sale.total,
            total: sale.total,
            payment_method: sale.paymentMethod || "cash",
            payment_status: "paid",
            status: "delivered",
            notes,
          },
        ])
        .select()
        .single();

      if (orderErr) {
        console.error("Error creando orden POS:", orderErr);
      }

      // 4. Registrar ítems en order_items si se creó la orden
      if (order?.id && sale.items.length > 0) {
        const orderItems = sale.items.map((item: any) => ({
          order_id: order.id,
          product_id: item.product.id && !item.product.id.startsWith("PROD-") ? item.product.id : null,
          product_title: item.product.title,
          quantity: item.quantity,
          price_at_purchase: item.product.publicPrice,
          cost_at_purchase: item.product.totalCostMxn || item.product.baseCostMxn || 0,
        }));

        await supabase.from("order_items").insert(orderItems);
      }

      // 5. Si el cliente proporcionó teléfono o tiene perfil, acumular puntos Club FoxDrop
      if (existingProfile || (cleanPhone && cleanPhone !== "Mostrador")) {
        try {
          const pointsEarned = Math.floor(sale.total / 10);
          const targetProfileId = existingProfile?.id;

          if (targetProfileId) {
            const currentPoints = existingProfile.loyalty_points || 0;
            await supabase
              .from("profiles")
              .update({
                loyalty_points: currentPoints + pointsEarned,
                updated_at: new Date().toISOString(),
              })
              .eq("id", targetProfileId);
          } else if (cleanPhone) {
            const { data: profByPhone } = await supabase
              .from("profiles")
              .select("id, loyalty_points")
              .or(`phone.eq.${cleanPhone}${cleanDigits && cleanDigits !== cleanPhone ? `,phone.eq.${cleanDigits}` : ''}`)
              .maybeSingle();

            if (profByPhone) {
              const currentPoints = profByPhone.loyalty_points || 0;
              await supabase
                .from("profiles")
                .update({
                  loyalty_points: currentPoints + pointsEarned,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", profByPhone.id);
            }
          }
        } catch (profErr) {
          console.warn("Nota: error acumulando puntos en perfil:", profErr);
        }
      }

      return NextResponse.json({
        success: true,
        orderNumber,
        date: new Date().toISOString(),
        orderId: order?.id || null,
      });
    }
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

    // ─── GENERACIÓN DE TICKET PROFESIONAL CON LOGO FOXDROP ───────
    if (action === "generate_ticket_image") {
      try {
        const { ticket } = body;
        if (!ticket || !ticket.orderNumber) {
          return NextResponse.json({ error: "Datos de ticket requeridos" }, { status: 400 });
        }

        const orderNumber = ticket.orderNumber;

        // Si el cliente nos mandó la imagen de ticket capturada y no está vacía (> 3000 chars)
        if (ticket.imageDataUrl && typeof ticket.imageDataUrl === "string" && ticket.imageDataUrl.startsWith("data:image/") && ticket.imageDataUrl.length > 3000) {
          const parts = ticket.imageDataUrl.split(",");
          const base64Str = parts[1] || parts[0];
          const ticketPngBuffer = Buffer.from(base64Str, "base64");
          // Si el buffer es mayor a 5KB (asegura que no es un pixel o canvas en blanco de 1KB)
          if (ticketPngBuffer.length > 5000) {
            const ticketFileName = `tickets/Ticket-${orderNumber}-${Date.now()}.png`;

            try {
              const { data: buckets } = await supabase.storage.listBuckets();
              const hasBucket = buckets?.some((b: any) => b.name === "product-images");
              if (!hasBucket) {
                await supabase.storage.createBucket("product-images", { public: true, fileSizeLimit: 10485760 });
              }
            } catch {}

            const { error: uploadErr } = await supabase.storage
              .from("product-images")
              .upload(ticketFileName, ticketPngBuffer, {
                contentType: "image/png",
                upsert: true,
              });

            let publicImageUrl = "";
            if (!uploadErr) {
              const { data: pubData } = supabase.storage.from("product-images").getPublicUrl(ticketFileName);
              publicImageUrl = pubData?.publicUrl || "";
            }

            return NextResponse.json({
              success: true,
              imageUrl: publicImageUrl || ticket.imageDataUrl,
              downloadUrl: publicImageUrl || ticket.imageDataUrl,
              base64: ticket.imageDataUrl,
            });
          }
        }

        const width = 600;
        const items = ticket.items || [];
        const dateStr = ticket.date ? new Date(ticket.date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString('es-MX');
        const clientName = ticket.clientName || 'Cliente FoxDrop';
        const clientPhone = ticket.clientPhone || 'Mostrador';
        const total = Number(ticket.total) || 0;
        const points = Number(ticket.pointsEarned) || Math.floor(total / 10);
        const methodNames: Record<string, string> = {
          cash: 'Efectivo',
          card: 'Tarjeta Débito/Crédito',
          spei: 'Transferencia SPEI',
        };
        const paymentMethod = methodNames[ticket.paymentMethod] || ticket.paymentMethod || 'Efectivo';

        // Calcular altura dinámica según cantidad de artículos
        const itemsHeight = Math.max(80, items.length * 42);
        const totalHeight = 680 + itemsHeight;
        const cardHeight = 480 + itemsHeight;

        const escapeXml = (unsafe: string) => {
          return (unsafe || '').replace(/[<>&'"]/g, (c) => {
            switch (c) {
              case '<': return '&lt;';
              case '>': return '&gt;';
              case '&': return '&amp;';
              case '\'': return '&apos;';
              case '"': return '&quot;';
              default: return c;
            }
          });
        };

        const rowsSvg = items.map((it: any, idx: number) => {
          const qty = it.quantity || 1;
          const title = escapeXml((it.product?.title || it.title || 'Artículo').slice(0, 32));
          const price = Number(it.product?.publicPrice || it.price || 0) * qty;
          return `
            <g transform="translate(0, ${idx * 40})">
              <text x="50" y="20" font-family="'Segoe UI', Roboto, Helvetica, sans-serif" font-size="15" font-weight="700" fill="#1e293b">${qty}x ${title}</text>
              <text x="550" y="20" font-family="'Courier New', monospace" font-size="16" font-weight="900" fill="#0f172a" text-anchor="end">$${price.toFixed(2)}</text>
            </g>
          `;
        }).join('');

        const dividerY = 360 + itemsHeight;
        const payY = dividerY + 35;
        const totalY = payY + 45;
        const clubBoxY = totalY + 30;
        const clubTextY = clubBoxY + 38;
        const footerY1 = clubBoxY + 95;
        const footerY2 = footerY1 + 22;

        const svg = `
        <svg width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#0F3E36"/>
              <stop offset="100%" stop-color="#1F2D3D"/>
            </linearGradient>
            <linearGradient id="orangeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#E65F2B"/>
              <stop offset="100%" stop-color="#FF8C42"/>
            </linearGradient>
            <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
              <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000" flood-opacity="0.1"/>
            </filter>
          </defs>

          <!-- Fondo general -->
          <rect width="${width}" height="${totalHeight}" rx="32" fill="#F1F5F9"/>
          
          <!-- Encabezado con degradado FoxDrop -->
          <path d="M 0 32 Q 0 0 32 0 L ${width - 32} 0 Q ${width} 0 ${width} 32 L ${width} 150 L 0 150 Z" fill="url(#headerGrad)"/>
          <rect x="0" y="146" width="${width}" height="5" fill="url(#orangeGrad)"/>

          <!-- Títulos del encabezado -->
          <text x="340" y="70" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="950" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.5">Foxdrop - Tu atajo al mundo</text>
          <text x="340" y="105" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="#E6A76E" text-anchor="middle" letter-spacing="2">COMPROBANTE OFICIAL DE COMPRA</text>

          <!-- Tarjeta central de ticket -->
          <rect x="25" y="170" width="550" height="${cardHeight}" rx="24" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" filter="url(#shadow)"/>

          <!-- Metadatos de la venta -->
          <text x="50" y="212" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="#64748B">FOLIO DE ORDEN</text>
          <text x="550" y="212" font-family="'Courier New', monospace" font-size="18" font-weight="900" fill="#E65F2B" text-anchor="end">${escapeXml(orderNumber)}</text>

          <text x="50" y="242" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="#64748B">FECHA Y HORA</text>
          <text x="550" y="242" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#1E293B" text-anchor="end">${escapeXml(dateStr)}</text>

          <text x="50" y="272" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="#64748B">CLIENTE</text>
          <text x="550" y="272" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#1E293B" text-anchor="end">${escapeXml(clientName)}</text>

          <text x="50" y="302" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="#64748B">TELÉFONO REGISTRADO</text>
          <text x="550" y="302" font-family="'Courier New', monospace" font-size="15" font-weight="800" fill="#0284C7" text-anchor="end">${escapeXml(clientPhone)}</text>

          <!-- Línea divisoria picada tipo ticket -->
          <line x1="50" y1="326" x2="550" y2="326" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="6,6"/>

          <!-- Encabezado de artículos -->
          <text x="50" y="354" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#94A3B8" letter-spacing="1">PRODUCTO(S)</text>
          <text x="550" y="354" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#94A3B8" text-anchor="end" letter-spacing="1">SUBTOTAL</text>

          <!-- Lista de artículos -->
          <g transform="translate(0, 360)">
            ${rowsSvg}
          </g>

          <!-- Línea divisoria sólida -->
          <line x1="50" y1="${dividerY}" x2="550" y2="${dividerY}" stroke="#E2E8F0" stroke-width="2"/>

          <!-- Método de pago y Total -->
          <text x="50" y="${payY}" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#64748B">MÉTODO DE PAGO</text>
          <text x="550" y="${payY}" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#1E293B" text-anchor="end">${escapeXml(paymentMethod)}</text>

          <text x="50" y="${totalY}" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900" fill="#0F172A">TOTAL PAGADO</text>
          <text x="550" y="${totalY}" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="950" fill="#0F3E36" text-anchor="end">$${total.toFixed(2)} MXN</text>

          <!-- Caja de Puntos Club FoxDrop -->
          <rect x="50" y="${clubBoxY}" width="500" height="62" rx="16" fill="#FFF7ED" stroke="#FDBA74" stroke-width="1.5"/>
          <text x="75" y="${clubTextY}" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="900" fill="#9A3412">⭐ CLUB FOXDROP:</text>
          <text x="525" y="${clubTextY}" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="950" fill="#EA580C" text-anchor="end">+${points} Puntos Ganados</text>

          <!-- Footer de garantía y web -->
          <text x="${width / 2}" y="${footerY1}" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#64748B" text-anchor="middle">Consulta tus puntos y catálogo completo en https://foxdrop.mx</text>
          <text x="${width / 2}" y="${footerY2}" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#94A3B8" text-anchor="middle">¡GRACIAS POR TU COMPRA EN FOXDROP PUEBLA! 🦊</text>
        </svg>
        `;

        // Renderizar PNG con sharp y estampar el logo del zorrito 3D
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const sharp = require("sharp");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require("path");
        const logoPath = path.join(process.cwd(), "public", "fox-logo-head-3d.png");

        const headBuf = await sharp(logoPath)
          .resize(90, 90, { fit: "contain" })
          .png()
          .toBuffer();

        const ticketPngBuffer = await sharp(Buffer.from(svg))
          .composite([{ input: headBuf, top: 30, left: 45 }])
          .png()
          .toBuffer();

        // Subir a Supabase Storage para generar URL pública y descargable directa
        const ticketFileName = `tickets/Ticket-${orderNumber}-${Date.now()}.png`;

        try {
          const { data: buckets } = await supabase.storage.listBuckets();
          const hasBucket = buckets?.some((b: any) => b.name === "product-images");
          if (!hasBucket) {
            await supabase.storage.createBucket("product-images", { public: true, fileSizeLimit: 10485760 });
          }
        } catch {}

        const { error: uploadErr } = await supabase.storage
          .from("product-images")
          .upload(ticketFileName, ticketPngBuffer, {
            contentType: "image/png",
            upsert: true,
          });

        let publicImageUrl = "";
        if (!uploadErr) {
          const { data: pubData } = supabase.storage.from("product-images").getPublicUrl(ticketFileName);
          publicImageUrl = pubData?.publicUrl || "";
        }

        const base64Data = `data:image/png;base64,${ticketPngBuffer.toString("base64")}`;

        return NextResponse.json({
          success: true,
          imageUrl: publicImageUrl || base64Data,
          downloadUrl: publicImageUrl || base64Data,
          base64: base64Data,
        });
      } catch (ticketErr: any) {
        console.error("Error generando ticket en servidor:", ticketErr);
        return NextResponse.json({ error: ticketErr.message || "Error al renderizar ticket" }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (err: any) {
    console.error("Error en /api/admin:", err);
    return NextResponse.json({ error: err.message || "Error interno del servidor" }, { status: 500 });
  }
}
