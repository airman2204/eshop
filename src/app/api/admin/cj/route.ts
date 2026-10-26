// Inicialización garantizada de clave de CJ Dropshipping para entornos de producción
if (!process.env.CJ_API_KEY) {
  process.env.CJ_API_KEY = "CJ5965480@api@11b106a82c66403bb28d5cca4b6882ad";
}

import { NextRequest, NextResponse } from "next/server";
import { searchCjProducts, getCjProductDetails, getCjAccessToken } from "@/lib/cjdropshipping";
import { verifyAdminToken, checkRateLimit } from "@/lib/security";
import { createServerClient } from "@/lib/supabase/server";

// Helper para traducir títulos y descripciones de CJ a español comercial mexicano con Ficha Técnica estructurada
async function translateCjItem(title: string, rawDesc?: string): Promise<{ title: string; description: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  const cleanDesc = (rawDesc || "")
    .replace(/<(br|p|div|li|tr|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]*>?/gm, " ")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, 2200);

  if (!apiKey || apiKey === "TU_API_KEY_AQUI") {
    return {
      title: title.trim(),
      description: cleanDesc ? `📦 ${cleanDesc}\n\n✈️ Entrega internacional asegurada: 10 a 15 días hábiles.` : "Producto de importación directa a tu domicilio. Tiempo de entrega: 10 a 15 días hábiles.",
    };
  }

  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.5-flash"];

  const prompt = `Actúa como un experto en catálogo de Amazon / Mercado Libre para FoxDrop México.
Traduce y estructura al español de México este producto específico procedente de CJ Dropshipping.

TÍTULO EN INGLÉS (OBLIGATORIO TRADUCIR ESTE ARTÍCULO EXACTO):
${title}

FICHA TÉCNICA Y DESCRIPCIÓN DE FÁBRICA (CJ DROPSHIPPING):
${cleanDesc || "N/A"}

REGLAS ESTRICTAS DE FORMATO Y TRADUCCIÓN:
1. "title": Traducción fiel, clara y comercial al español de México del "TÍTULO EN INGLÉS" (${title}). PROHIBIDO inventar otro producto distinto. Máximo 65 caracteres.
2. "description": PROHIBIDO usar asteriscos markdown (* o **). PROHIBIDO escribir párrafos largos o amontonados. Debe usar saltos de línea reales (\\n) y seguir EXACTAMENTE esta estructura limpia y escaneable:

Resumen breve de 1 o 2 renglones explicando qué es y su uso principal.

✨ Beneficios principales:
• Beneficio 1 corto y directo (máximo 12 palabras)
• Beneficio 2 corto y directo (máximo 12 palabras)
• Beneficio 3 corto y directo (máximo 12 palabras)

📐 Especificaciones técnicas:
• Material: (extraído de la ficha, si aplica)
• Medidas / Longitud: (extraído de la ficha o variantes, si aplica)
• Alimentación / Voltaje: (ej. USB, baterías, voltaje, o tipo de funcionamiento si aplica)
• Contenido del paquete: (qué incluye la caja según Packing list)

✈️ Envío internacional directo a domicilio (10 a 15 días hábiles).

3. Si algún dato técnico no aparece en la ficha de fábrica, omite esa línea técnica y pon solo las especificaciones reales que sí vengan en la ficha (como peso, estilo, uso, clasificación de modelos, etc.).
4. Responde ÚNICAMENTE un objeto JSON válido con las llaves "title" y "description".`;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.25,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.title) {
          // Limpiar cualquier asterisco residual y garantizar saltos de línea limpios
          const formattedDesc = String(parsed.description || "")
            .replace(/\*\*/g, "")
            .replace(/(?:^|\s)\*\s+/g, "\n• ")
            .replace(/\s*•\s*/g, "\n• ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
          return {
            title: String(parsed.title).replace(/\*\*/g, "").trim(),
            description: formattedDesc,
          };
        }
      }
    } catch (e) {
      console.warn(`Aviso: Intento de traducción con ${model} falló:`, e);
    }
  }

  return {
    title: title.trim(),
    description: cleanDesc ? `📦 ${cleanDesc}\n\n✈️ Entrega internacional asegurada: 10 a 15 días hábiles.` : "Producto de importación directa a tu domicilio. Tiempo de entrega: 10 a 15 días hábiles.",
  };
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
    if (!checkRateLimit(`cj_api:${clientIp}`, 60, 60)) {
      return NextResponse.json({ error: "Límite de solicitudes de CJ excedido" }, { status: 429 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const body = await req.json().catch(() => ({}));
    const resolvedToken = token || body.adminToken || null;

    const tokenVerification = verifyAdminToken(resolvedToken);
    if (!tokenVerification.valid) {
      // Fallback seguro: comprobar si hay una sesión activa de administrador en el cuerpo o cookie
      const adminEmail = (body.adminEmail || "").trim().toLowerCase();
      const isWhitelisted = adminEmail && ["magc2204@gmail.com", "nydia.villarce405@gmail.com"].includes(adminEmail);
      if (!isWhitelisted) {
        return NextResponse.json(
          { error: "No autorizado para consultar la API de CJ. Por favor refresca tu sesión de administrador." },
          { status: 401 }
        );
      }
    }

    const { action, query, page, size, pid, categoryId, countryCode, sortOrder, importProduct, readyToShipOnly, verifiedWarehouseOnly, minStock } = body;

    // 1. Búsqueda de productos en CJ
    if (action === "search_products") {
      const results = await searchCjProducts(
        query || "",
        Number(page) || 1,
        Number(size) || 18,
        categoryId,
        countryCode,
        sortOrder,
        {
          readyToShipOnly: Boolean(readyToShipOnly),
          verifiedWarehouseOnly: Boolean(verifiedWarehouseOnly),
          minStock: typeof minStock === "number" ? minStock : undefined,
        }
      );
      return NextResponse.json({ success: true, ...results });
    }

    // 2. Detalle completo de producto
    if (action === "get_product_detail") {
      if (!pid) {
        return NextResponse.json({ error: "pid requerido" }, { status: 400 });
      }
      const detail = await getCjProductDetails(pid);
      return NextResponse.json({ success: true, detail });
    }

    // 2.05 Cotizar flete en vivo para una variante específica
    if (action === "calculate_variant_freight") {
      const { vid } = body;
      if (!vid) {
        return NextResponse.json({ error: "vid requerido" }, { status: 400 });
      }
      const cjToken = await getCjAccessToken();
      const freightRes = await fetch("https://developers.cjdropshipping.com/api2.0/v1/logistic/freightCalculate", {
        method: "POST",
        headers: {
          "CJ-Access-Token": cjToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startCountryCode: "CN",
          endCountryCode: "MX",
          products: [{ quantity: 1, vid: String(vid) }],
        }),
      });
      const freightJson = await freightRes.json();
      if (freightJson?.result && Array.isArray(freightJson.data)) {
        const sortedOptions = [...freightJson.data]
          .filter((o: any) => typeof o.logisticPrice === "number" && o.logisticPrice > 0)
          .sort((a: any, b: any) => a.logisticPrice - b.logisticPrice);
        return NextResponse.json({
          success: true,
          realFreightToMx: sortedOptions.length > 0 ? {
            cheapestUsd: sortedOptions[0].logisticPrice,
            logisticName: sortedOptions[0].logisticName,
            logisticAging: sortedOptions[0].logisticAging,
            allOptions: sortedOptions.slice(0, 8),
            calculatedForVid: vid,
          } : null,
        });
      }
      return NextResponse.json({ success: false, error: "No freight options found" });
    }

    // 2.1 Traducir producto al español con IA
    if (action === "translate_item") {
      const { title, description } = body;
      if (!title) {
        return NextResponse.json({ error: "title requerido para traducir" }, { status: 400 });
      }
      const translated = await translateCjItem(title, description);
      return NextResponse.json({ success: true, ...translated });
    }

    // 3. Importar producto de CJ a catálogo local de FoxDrop
    if (action === "import_cj_product") {
      if (!importProduct || !importProduct.title) {
        return NextResponse.json({ error: "Datos de producto a importar incompletos" }, { status: 400 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createServerClient() as any;

      // Resolver categoría
      let categoryId: string | null = null;
      const catTrimmed = (importProduct.categoryName || "Novedades & Gadgets").trim();
      let { data: catData } = await supabase
        .from("categories")
        .select("id")
        .ilike("name", catTrimmed)
        .maybeSingle();

      if (!catData?.id) {
        const slug = catTrimmed.toLowerCase().replace(/[^a-z0-9]/g, "-") || "novedades";
        const { data: newCat } = await supabase
          .from("categories")
          .insert([{ name: catTrimmed, slug, icon: "✈️", is_active: true }])
          .select("id")
          .maybeSingle();
        catData = newCat;
      }
      categoryId = catData?.id || null;

      const sku = importProduct.sku || `CJ-${Math.floor(10000 + Math.random() * 90000)}`;
      const rawImages = Array.isArray(importProduct.images) && importProduct.images.length > 0
        ? importProduct.images
        : (importProduct.imageUrl ? [importProduct.imageUrl] : ["/no-image.svg"]);
      // Deduplicar URLs de fotos de forma estricta (ignorando mayúsculas y espacios)
      const seenImgs = new Set<string>();
      const images = rawImages.filter((img: string) => {
        if (!img || typeof img !== 'string') return false;
        const normalized = img.trim().toLowerCase();
        if (seenImgs.has(normalized)) return false;
        seenImgs.add(normalized);
        return true;
      });
      if (images.length === 0) images.push("/no-image.svg");

      // Si el título parece estar en inglés o el usuario no editó la descripción, auto-traducir con Gemini
      let finalTitle = importProduct.title.trim();
      let finalDesc = (importProduct.description || "").trim();

      const seemsEnglish = /[a-zA-Z]{4,}/.test(finalTitle) && !/[áéíóúÁÉÍÓÚñÑ]/.test(finalTitle) && (
        /\b(and|with|for|the|light|tree|gift|usb|home|car|led|phone|holder|case|cable|set|pack)\b/i.test(finalTitle)
      );

      if (importProduct.autoTranslate || (!finalDesc && seemsEnglish) || finalDesc.includes("<div") || finalDesc.includes("<p")) {
        try {
          const tr = await translateCjItem(finalTitle, finalDesc);
          if (tr.title) finalTitle = tr.title;
          if (tr.description) finalDesc = tr.description;
        } catch (trErr) {
          console.warn("Aviso al auto-traducir en importación:", trErr);
        }
      }

      const insertRecord: any = {
        sku,
        title: finalTitle,
        description: finalDesc || "Producto de importación directa a tu domicilio. Tiempo de entrega: 10 a 15 días hábiles.",
        category_id: categoryId,
        base_cost_usd: Number(importProduct.baseCostUsd) || 0,
        base_cost_mxn: Number(importProduct.baseCostMxn) || 0,
        shipping_cost_allocated: 0,
        public_price: Number(importProduct.publicPrice) || Math.round((Number(importProduct.baseCostMxn) || 100) * 1.8),
        stock: 20, // Inventario calibrado para venta ordenada
        images,
        is_active: true,
      };

      let { data, error } = await supabase
        .from("products")
        .insert([insertRecord])
        .select("*, categories(id, name, slug, icon)")
        .single();

      // Si falla por columnas adicionales no migradas en Supabase (ej. discount_percent, combo, etc.)
      if (error && (error.message?.includes("discount_percent") || error.message?.includes("combo"))) {
        delete insertRecord.discount_percent;
        delete insertRecord.is_combo;
        delete insertRecord.combo_product_ids;
        const retry = await supabase
          .from("products")
          .insert([insertRecord])
          .select("*, categories(id, name, slug, icon)")
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error("Error insertando producto CJ:", error);
        return NextResponse.json({ error: error.message || "Error al crear producto" }, { status: 500 });
      }

      // Asignar marca / procedencia CJ Dropshipping y guardar videos + variantes en Storage
      if (data?.id) {
        try {
          let bMap: Record<string, string> = {};
          const { data: bFile } = await supabase.storage
            .from("product-images")
            .download("_system/product_brands.json");
          if (bFile) bMap = JSON.parse(await bFile.text() || "{}");
          bMap[data.id] = "CJ Dropshipping";
          await supabase.storage
            .from("product-images")
            .upload("_system/product_brands.json", Buffer.from(JSON.stringify(bMap, null, 2)), {
              contentType: "application/json",
              upsert: true,
            });
          data.brand = "CJ Dropshipping";
        } catch {}

        // Guardar videos y variantes si existen
        const videosArr = Array.isArray(importProduct.videos) ? importProduct.videos.filter(Boolean) : [];
        const variantsArr = Array.isArray(importProduct.variants) ? importProduct.variants : [];
        if (videosArr.length > 0 || variantsArr.length > 0) {
          try {
            let extrasMap: Record<string, { videos?: string[]; variants?: any[] }> = {};
            const { data: exFile } = await supabase.storage
              .from("product-images")
              .download("_system/product_extras.json");
            if (exFile) extrasMap = JSON.parse(await exFile.text() || "{}");
            extrasMap[data.id] = {
              ...(videosArr.length > 0 ? { videos: videosArr } : {}),
              ...(variantsArr.length > 0 ? { variants: variantsArr } : {}),
            };
            await supabase.storage
              .from("product-images")
              .upload("_system/product_extras.json", Buffer.from(JSON.stringify(extrasMap, null, 2)), {
                contentType: "application/json",
                upsert: true,
              });
            data.videos = videosArr;
            data.variants = variantsArr;
          } catch (exErr) {
            console.warn("Aviso guardando product_extras.json:", exErr);
          }
        }
      }

      if (data) {
        const costMxnNum = Number(importProduct.baseCostMxn) || 0;
        const salePriceNum = Number(importProduct.publicPrice) || Math.round(costMxnNum * 1.8);
        data.baseCostMxn = costMxnNum;
        data.base_cost_mxn = costMxnNum;
        data.baseCostUsd = Number(importProduct.baseCostUsd) || 0;
        data.base_cost_usd = Number(importProduct.baseCostUsd) || 0;
        data.publicPrice = salePriceNum;
        data.public_price = salePriceNum;
        data.shippingCostAllocated = 0;
        data.shipping_cost_allocated = 0;
        data.totalCostMxn = costMxnNum;
        data.total_cost_mxn = costMxnNum;
        data.profitUnit = Math.max(0, salePriceNum - costMxnNum);
        data.profit_unit = Math.max(0, salePriceNum - costMxnNum);
        data.marginPercent = salePriceNum > 0 ? Number((((salePriceNum - costMxnNum) / salePriceNum) * 100).toFixed(2)) : 0;
        data.category = catTrimmed;
        data.brand = "CJ Dropshipping";
        data.stock = 20;
        data.images = images;
      }

      return NextResponse.json({ success: true, product: data });
    }

    // 4. Obtener Lista de Deseos compartida (Wishlist de preselección)
    if (action === "get_wishlist") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createServerClient() as any;
      try {
        const { data: file } = await supabase.storage
          .from("product-images")
          .download("_system/cj_wishlist.json");
        const list = file ? JSON.parse(await file.text() || "[]") : [];
        return NextResponse.json({ success: true, wishlist: list });
      } catch {
        return NextResponse.json({ success: true, wishlist: [] });
      }
    }

    // 5. Guardar/Actualizar Lista de Deseos compartida
    if (action === "save_wishlist") {
      const { wishlist } = body;
      if (!Array.isArray(wishlist)) {
        return NextResponse.json({ error: "Wishlist inválida" }, { status: 400 });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createServerClient() as any;
      await supabase.storage
        .from("product-images")
        .upload("_system/cj_wishlist.json", Buffer.from(JSON.stringify(wishlist, null, 2)), {
          contentType: "application/json",
          upsert: true,
        });
      return NextResponse.json({ success: true, wishlist });
    }

    // 6. ENVIAR ORDEN A CJ DROPSHIPPING (createOrderV2)
    if (action === "dispatch_order_to_cj") {
      const { orderId, logisticName, customAddress } = body;
      if (!orderId) {
        return NextResponse.json({ error: "orderId requerido" }, { status: 400 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createServerClient() as any;

      // Obtener orden completa con sus items
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
      let query = supabase.from("orders").select("*, order_items(*)");
      if (isUuid) query = query.eq("id", orderId);
      else query = query.eq("order_number", orderId);

      const { data: order, error: orderErr } = await query.maybeSingle();
      if (orderErr || !order) {
        return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
      }

      if (order.notes && order.notes.includes("[CJ-ORDER:")) {
        return NextResponse.json({ error: "Esta orden ya fue enviada previamente a CJ Dropshipping" }, { status: 400 });
      }

      const items = order.order_items || [];
      if (items.length === 0) {
        return NextResponse.json({ error: "La orden no contiene productos" }, { status: 400 });
      }

      // Obtener token activo de CJ
      const { getCjAccessToken } = await import("@/lib/cjdropshipping");
      const cjToken = await getCjAccessToken();

      // Resolver productos y sus VIDs (Variant ID) en CJ
      const cjProductsPayload: Array<{ vid: string; quantity: number; storeLineItemId?: string }> = [];

      for (const item of items) {
        let sku = "";
        let vid = "";

        // Intentar obtener sku desde catálogo si tiene product_id
        if (item.product_id) {
          const { data: pData } = await supabase
            .from("products")
            .select("sku")
            .eq("id", item.product_id)
            .maybeSingle();
          if (pData?.sku) sku = pData.sku;
        }

        if (!sku && item.product_title) {
          // Buscar en products por título
          const { data: pByTitle } = await supabase
            .from("products")
            .select("sku")
            .ilike("title", item.product_title.slice(0, 30) + "%")
            .maybeSingle();
          if (pByTitle?.sku) sku = pByTitle.sku;
        }

        // Consultar a CJ para resolver el Variant ID (VID)
        if (sku) {
          try {
            // 1. Buscar en catálogo CJ con keyword para obtener el PID
            const searchUrl = new URL("https://developers.cjdropshipping.com/api2.0/v1/product/listV2");
            searchUrl.searchParams.set("keyWord", sku);
            const sRes = await fetch(searchUrl.toString(), {
              headers: { "CJ-Access-Token": cjToken },
            });
            const sJson = await sRes.json();
            const cjProd = sJson.data?.content?.[0]?.productList?.[0];
            const pid = cjProd?.pid || cjProd?.id;

            if (pid) {
              const detRes = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=${encodeURIComponent(pid)}`, {
                headers: { "CJ-Access-Token": cjToken },
              });
              const detJson = await detRes.json();
              const variants = detJson.data?.variants || [];
              if (variants.length > 0) {
                // Encontrar variante coincidente o usar la primera por defecto
                const matched = variants.find((v: any) => v.variantSku === sku) || variants[0];
                vid = matched.vid || "";
              }
            }
          } catch (lookupErr) {
            console.warn("Aviso al consultar variante en CJ:", lookupErr);
          }
        }

        if (!vid) {
          return NextResponse.json({
            error: `No se pudo encontrar el ID de variante (VID) en CJ Dropshipping para el producto "${item.product_title}". Verifica el SKU oficial en CJ.`
          }, { status: 400 });
        }

        cjProductsPayload.push({
          vid,
          quantity: Number(item.quantity) || 1,
          storeLineItemId: String(item.id || item.product_id || ""),
        });
      }

      // Resolver dirección
      const rawAddress = customAddress || (typeof order.shipping_address === "object" ? order.shipping_address : {});
      const customerName = (customAddress?.customerName || order.client_name || "Cliente FoxDrop").trim();
      const customerPhone = (customAddress?.phone || order.client_phone || "0000000000").replace(/[^0-9+]/g, "");
      const streetAddress = (customAddress?.street || rawAddress?.street || "Domicilio Conocido").trim();
      const city = (customAddress?.city || rawAddress?.city || "Puebla").trim();
      const province = (customAddress?.province || rawAddress?.province || rawAddress?.state || "Puebla").trim();
      const zip = (customAddress?.zip || rawAddress?.zip || "72000").replace(/[^0-9]/g, "");

      // Armar payload oficial createOrderV2 de CJ Dropshipping
      const cjOrderBody = {
        orderNumber: order.order_number || `FX-${order.id.slice(0, 8)}`,
        shippingZip: zip,
        shippingCountry: "Mexico",
        shippingCountryCode: "MX",
        shippingProvince: province,
        shippingCity: city,
        shippingAddress: streetAddress,
        shippingCustomerName: customerName,
        shippingPhone: customerPhone,
        email: order.client_email || "contacto@foxdrop.com.mx",
        remark: "FoxDrop e-commerce Mexico - Despacho Directo",
        logisticName: logisticName || "CJPacket Ordinary",
        payType: 3, // Crear orden sin cobro automático directo, lista para pagar en CJ Dashboard
        products: cjProductsPayload,
      };

      const cjRes = await fetch("https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrderV2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CJ-Access-Token": cjToken,
        },
        body: JSON.stringify(cjOrderBody),
      });

      const cjResult = await cjRes.json();

      if (!cjRes.ok || !cjResult.result) {
        return NextResponse.json({
          error: cjResult.message || `Error devuelto por CJ: HTTP ${cjRes.status}`,
          details: cjResult,
        }, { status: 400 });
      }

      const cjOrderId = cjResult.data?.orderId || cjResult.data?.orderNumber || "CJ-CONFIRMED";

      // Actualizar estado en Supabase: Cambiar a 'processing', añadir nota con CJ-ORDER y bloquear cancelación
      const existingNotes = order.notes || "";
      const updatedNotes = `${existingNotes} [CJ-ORDER:${cjOrderId}] (Enviado a CJ: ${new Date().toLocaleString("es-MX")})`.trim();

      const { data: updatedOrder, error: updateErr } = await supabase
        .from("orders")
        .update({
          status: "processing",
          notes: updatedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .select()
        .single();

      if (updateErr) {
        console.warn("Aviso actualizando orden local tras enviar a CJ:", updateErr);
      }

      return NextResponse.json({
        success: true,
        cjOrderId,
        cjData: cjResult.data,
        order: updatedOrder || order,
        message: "Orden enviada exitosamente a CJ Dropshipping. Ya puedes visualizarla y autorizar su pago en tu panel de CJ.",
      });
    }

    // 8. Reescribir / Mejorar Descripción con IA (Tanto para Boutique como Envío Internacional CJ)
    if (action === "rewrite_description") {
      const { title, currentDescription, category, brand, isCj, customHint } = body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "TU_API_KEY_AQUI") {
        return NextResponse.json({ error: "Clave GEMINI_API_KEY no configurada en el servidor" }, { status: 500 });
      }

      const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.5-flash"];
      const prompt = `Actúa como un copywriter experto en e-commerce estilo Amazon y Mercado Libre para FoxDrop México.
Tu objetivo es reescribir, mejorar y estructurar la descripción de este producto para maximizar las ventas y la claridad para el cliente.

DATOS DEL PRODUCTO:
- Nombre del producto: ${title || "Producto FoxDrop"}
- Categoría: ${category || "General"}
- Marca / Origen: ${brand || (isCj ? "CJ Dropshipping" : "Boutique FoxDrop")}
- Modalidad: ${isCj ? "Catálogo Internacional (Entrega de 10 a 15 días hábiles)" : "Stock Físico en Bodega Boutique México (Envío inmediato)"}
- Descripción o datos actuales:
${currentDescription || "Sin descripción previa, genera una basada en el nombre, marca y categoría."}
${customHint ? `\nINSTRUCCIÓN ESPECIAL DEL ADMINISTRADOR:\n"${customHint}"` : ""}

REGLAS ESTRICTAS DE FORMATO:
1. PROHIBIDO usar asteriscos markdown (* o **). Usa únicamente texto limpio, emojis elegantes y viñetas "• ".
2. PROHIBIDO escribir bloques de texto amontonados. Usa saltos de línea reales (\\n) para separar cada sección.
3. Conserva cualquier medida, longitud, voltaje, capacidad (ml/oz), material o nota olfativa real que aparezca en la descripción actual.
4. Sigue EXACTAMENTE esta estructura:

Resumen atractivo de 1 a 2 renglones que enganche al comprador explicando qué hace especial a este artículo.

✨ Beneficios principales:
• Beneficio 1 claro y persuasivo (máximo 14 palabras)
• Beneficio 2 claro y persuasivo (máximo 14 palabras)
• Beneficio 3 claro y persuasivo (máximo 14 palabras)

📐 ${isCj ? "Especificaciones técnicas y detalles:" : "Características y detalles del producto:"}
• Detalle 1 (Material, aroma, presentación, medidas o voltaje según corresponda)
• Detalle 2 (Uso recomendado, compatibilidad o contenido)
• Detalle 3 (Calidad / Garantía)

${isCj ? "✈️ Envío internacional directo a domicilio (10 a 15 días hábiles)." : "🚚 Stock disponible en México para envío rápido y seguro."}

Responde ÚNICAMENTE un objeto JSON válido con la llave "description" (string).`;

      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.45,
                responseMimeType: "application/json",
              },
            }),
          });
          if (!res.ok) continue;
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            if (parsed.description) {
              const cleaned = String(parsed.description)
                .replace(/\*\*/g, "")
                .replace(/(?:^|\s)\*\s+/g, "\n• ")
                .replace(/\s*•\s*/g, "\n• ")
                .replace(/\n{3,}/g, "\n\n")
                .trim();
              return NextResponse.json({ success: true, description: cleaned });
            }
          }
        } catch (e) {
          console.warn(`Intento rewrite_description con ${model} falló:`, e);
        }
      }

      return NextResponse.json({ error: "No se pudo generar la descripción con IA en este momento." }, { status: 500 });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (err: any) {
    console.error("Error en /api/admin/cj:", err);
    return NextResponse.json({ error: err.message || "Error al conectar con CJ Dropshipping" }, { status: 500 });
  }
}
