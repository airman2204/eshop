import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/security";
import { createServerClient } from "@/lib/supabase/server";

const RAKUTEN_APP_ID = process.env.RAKUTEN_APPLICATION_ID || "02f0acd7-36ba-4ef7-9538-fd9d6e1eaa9e";
const RAKUTEN_ACCESS_KEY = process.env.RAKUTEN_ACCESS_KEY || "pk_uY1yOYNOOvMm9eYnXJRBre7sYo7RegTGPSVLAVx5vZ0";
const RAKUTEN_AFFILIATE_ID = process.env.RAKUTEN_AFFILIATE_ID || "58fa10e4.8474c111.58fa10e5.6ecfef07";

// Helper para traducir títulos japoneses a español comercial mexicano
async function translateJapanItem(title: string, rawCaption?: string): Promise<{ title: string; description: string; category: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  const cleanCaption = (rawCaption || "")
    .replace(/<[^>]*>?/gm, " ")
    .replace(/[ \t]+/g, " ")
    .slice(0, 1500)
    .trim();

  if (!apiKey || apiKey === "TU_API_KEY_AQUI") {
    return {
      title: title.slice(0, 60),
      description: cleanCaption ? `📦 ${cleanCaption}\n\n🎌 Producto original importado de Japón. Entrega asegurada de 10 a 15 días hábiles.` : "Producto original importado de Japón.",
      category: "Figuras & Coleccionables"
    };
  }

  const prompt = `Actúa como especialista en catálogo de productos japoneses de importación para FoxDrop México.
Traduce y adapta este producto de Rakuten Japón a un título comercial claro y una descripción atractiva para compradores en México.

TÍTULO EN JAPONÉS:
${title}

FICHA / DESCRIPCIÓN JAPONESA:
${cleanCaption || "N/A"}

REGLAS ESTRICTAS:
1. "title": Título claro, comercial y llamativo en español de México (máximo 65 caracteres). Ejemplo: "Figura Banpresto Grandista Shanks - One Piece" o "Caja Coleccionador Pokémon TCG 151 (Japón)".
2. "category": Selecciona la categoría más afín de estas opciones:
- Figuras & Coleccionables
- Dulces & Snacks Japoneses
- Belleza & Cuidado Personal
- Papelería & Kawaii
- Videojuegos & Geek
- Hogar & Té Matcha
3. "description": Texto limpio y sin asteriscos dobles. Estructurado con:
- Resumen breve de 1 o 2 renglones explicando qué es y su autenticidad japonesa.
- ✨ Características principales (3 viñetas cortas).
- 🎌 Producto 100% original importado directo de Japón.
- ✈️ Envío internacional asegurado a tu domicilio (10 a 15 días hábiles).

Responde ÚNICAMENTE en JSON con este formato:
{
  "title": "...",
  "category": "...",
  "description": "..."
}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        return {
          title: parsed.title || title.slice(0, 60),
          category: parsed.category || "Figuras & Coleccionables",
          description: parsed.description || "Producto original importado de Japón."
        };
      }
    }
  } catch (err) {
    console.warn("Fallo traducción Gemini Japón:", err);
  }

  return {
    title: title.slice(0, 60),
    category: "Figuras & Coleccionables",
    description: "🎌 Producto 100% original importado de Japón. Tiempo de entrega: 10 a 15 días hábiles."
  };
}

// Helper para traducir rápidamente lote de títulos japoneses a español en la vista previa
async function quickTranslateTitles(titles: string[]): Promise<string[]> {
  if (!titles || titles.length === 0) return [];
  try {
    const promises = titles.map(async (text) => {
      try {
        const res = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=es&dt=t&q=${encodeURIComponent(text)}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            cache: 'force-cache',
          }
        );
        if (res.ok) {
          const d = await res.json();
          if (Array.isArray(d?.[0])) {
            const translated = d[0].map((s: any) => s[0]).join('').trim();
            if (translated) return translated;
          }
        }
      } catch {}
      return text;
    });

    return await Promise.all(promises);
  } catch (e) {
    console.warn("Fallo traducción rápida de títulos:", e);
  }
  return titles;
}

// ──────────────────────────────────────────────────────────────────────────────
// GET: Buscar productos en Rakuten Ichiba Japón en vivo
// ──────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword") || searchParams.get("q") || "pokemon";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const hits = parseInt(searchParams.get("hits") || "30", 10);
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const sort = searchParams.get("sort") || "standard";
    const shopOfTheYearFlag = searchParams.get("shopOfTheYearFlag");
    const asurakuFlag = searchParams.get("asurakuFlag");
    const postageFlag = searchParams.get("postageFlag");
    const hasReviewFlag = searchParams.get("hasReviewFlag");

    let url = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?applicationId=${RAKUTEN_APP_ID}&accessKey=${RAKUTEN_ACCESS_KEY}&affiliateId=${RAKUTEN_AFFILIATE_ID}&keyword=${encodeURIComponent(keyword)}&page=${page}&hits=${hits}&format=json`;

    if (minPrice) url += `&minPrice=${minPrice}`;
    if (maxPrice) url += `&maxPrice=${maxPrice}`;
    if (sort) url += `&sort=${encodeURIComponent(sort)}`;
    if (shopOfTheYearFlag === "1") url += `&shopOfTheYearFlag=1`;
    if (asurakuFlag === "1") url += `&asurakuFlag=1`;
    if (postageFlag === "1") url += `&postageFlag=1`;
    if (hasReviewFlag === "1") url += `&hasReviewFlag=1`;

    const rakutenRes = await fetch(url, {
      headers: {
        "Origin": "https://foxdrop.mx",
        "Referer": "https://foxdrop.mx"
      }
    });

    if (!rakutenRes.ok) {
      const err = await rakutenRes.json().catch(() => ({}));
      return NextResponse.json({ error: err.message || "Error al consultar Rakuten Japón" }, { status: rakutenRes.status });
    }

    const data = await rakutenRes.json();
    
    // Tasa aproximada de conversión JPY a MXN (aprox 1 JPY = 0.119 MXN o 1 MXN = 8.4 JPY)
    const JPY_TO_MXN_RATE = 0.12; 

    const items = (data.Items || []).map((wrapper: any) => {
      const item = wrapper.Item;
      const priceJpy = Number(item.itemPrice || 0);
      const baseCostMxn = Math.round(priceJpy * JPY_TO_MXN_RATE);
      
      // Costo de flete internacional aéreo Tokio -> México (escalonado según categoría, volumen y valor)
      // Paquete ligero (cartas TCG, llaveros, cosméticos pequeños < 5,000 JPY): $140 MXN
      // Paquete mediano (figuras estándar, cajas de cartas, ropa 5,000 - 20,000 JPY): $260 MXN
      // Paquete pesado / consolas / cajas grandes (> 20,000 JPY o consolas): $480 MXN
      let estimatedShippingMxn = 140;
      const lowerName = (item.itemName || "").toLowerCase();
      if (priceJpy > 25000 || lowerName.includes("switch") || lowerName.includes("ps5") || lowerName.includes("console") || lowerName.includes("box set")) {
        estimatedShippingMxn = 480;
      } else if (priceJpy > 5000 || lowerName.includes("figure") || lowerName.includes("box") || lowerName.includes("plush")) {
        estimatedShippingMxn = 260;
      }

      const totalCostMxn = baseCostMxn + estimatedShippingMxn;
      // Margen comercial sugerido FoxDrop (35% de utilidad neta libre)
      const suggestedPublicPrice = Math.round((totalCostMxn * 1.35) / 10) * 10 - 1; // ej. 399, 449, 599, etc.

      // Extraer imágenes en Alta Resolución (removiendo el parámetro de thumbnail)
      const rawImages: string[] = [];
      if (item.mediumImageUrls && item.mediumImageUrls.length > 0) {
        item.mediumImageUrls.forEach((imgObj: any) => {
          if (imgObj.imageUrl) {
            rawImages.push(imgObj.imageUrl.replace(/\?_ex=\d+x\d+/, ""));
          }
        });
      }

      return {
        itemCode: item.itemCode,
        itemName: item.itemName,
        itemNameEs: item.itemName, // Se llenará con la traducción rápida
        catchcopy: item.catchcopy || "",
        caption: item.itemCaption || "",
        priceJpy,
        baseCostMxn,
        estimatedShippingMxn,
        totalCostMxn,
        suggestedPublicPrice: Math.max(149, suggestedPublicPrice),
        images: rawImages,
        shopName: item.shopName,
        shopCode: item.shopCode,
        shopUrl: item.shopUrl,
        itemUrl: item.itemUrl,
        affiliateUrl: item.affiliateUrl,
        availability: item.availability === 1,
        reviewAverage: Number(item.reviewAverage || 0),
        reviewCount: Number(item.reviewCount || 0),
        shopOfTheYear: item.shopOfTheYearFlag === 1,
        asurakuFastShipping: item.asurakuFlag === 1,
        freeJapanShipping: item.postageFlag === 1,
      };
    });

    // Traducir títulos automáticamente a español para la vista del catálogo
    const titlesToTranslate = items.map((it: any) => it.itemName);
    const translatedTitles = await quickTranslateTitles(titlesToTranslate);
    items.forEach((it: any, idx: number) => {
      it.itemNameEs = translatedTitles[idx] || it.itemName;
    });

    return NextResponse.json({
      success: true,
      count: data.count || 0,
      page: data.page || page,
      pageCount: data.pageCount || 1,
      hits: data.hits || hits,
      items,
      jpyToMxnRate: JPY_TO_MXN_RATE,
    });
  } catch (err: any) {
    console.error("Error en API de Rakuten Japón:", err);
    return NextResponse.json({ error: err.message || "Error interno de servidor" }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST: Traducir con IA e Importar Producto a Catálogo FoxDrop
// ──────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const body = await req.json();
    const resolvedToken = token || body.adminToken || null;
    const adminEmail = (body.adminEmail || req.headers.get("x-admin-email") || "").trim().toLowerCase();
    const isWhitelisted = adminEmail && ["magc2204@gmail.com", "nydia.villarce405@gmail.com"].includes(adminEmail);

    if (!verifyAdminToken(resolvedToken).valid && !isWhitelisted) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const action = body.action || "import";

    // 1. Traducir con Gemini IA antes de guardar
    if (action === "translate") {
      const { title, caption } = body;
      if (!title) return NextResponse.json({ error: "Título requerido" }, { status: 400 });

      const translated = await translateJapanItem(title, caption);
      return NextResponse.json({ success: true, ...translated });
    }

    // 2. Importar a Supabase en la tabla `products`
    if (action === "import") {
      const { 
        itemCode, 
        title, 
        description, 
        categoryName, 
        priceJpy, 
        baseCostMxn, 
        shippingCostMxn, 
        publicPrice, 
        images, 
        stock,
        rakutenUrl,
        shopName
      } = body;

      if (!title || !publicPrice) {
        return NextResponse.json({ error: "Faltan datos obligatorios para importar" }, { status: 400 });
      }

      const supabase = createServerClient() as any;

      // Generar SKU distintivo de Japón: JP-XXXXXX
      const cleanCode = (itemCode || "").replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
      const sku = `JP-${cleanCode || Math.floor(100000 + Math.random() * 900000)}`;

      // Resolver o crear categoría
      let categoryId = null;
      if (categoryName) {
        const catTrimmed = categoryName.trim();
        const { data: catData } = await supabase
          .from("categories")
          .select("id")
          .ilike("name", catTrimmed)
          .maybeSingle();

        if (catData?.id) {
          categoryId = catData.id;
        } else {
          const slug = catTrimmed.toLowerCase().replace(/[^a-z0-9]/g, "-") || "japon";
          const { data: newCat } = await supabase
            .from("categories")
            .insert([{ name: catTrimmed, slug, icon: "🎌", is_active: true }])
            .select("id")
            .maybeSingle();
          categoryId = newCat?.id;
        }
      }

      const totalCost = Number(baseCostMxn || 0) + Number(shippingCostMxn || 0);
      const profitUnit = Number(publicPrice) - totalCost;

      const productPayload = {
        sku,
        title: title.trim(),
        description: description?.trim() || "🎌 Producto original importado directamente desde Japón con entrega garantizada a domicilio.",
        category_id: categoryId,
        base_cost_usd: Number(((Number(priceJpy || 0) / 157)).toFixed(2)),
        base_cost_mxn: Number(baseCostMxn || 0),
        shipping_cost_allocated: Number(shippingCostMxn || 120),
        total_cost_mxn: totalCost,
        public_price: Number(publicPrice),
        profit_unit: profitUnit,
        stock: Number(stock || 20),
        is_active: true,
        images: Array.isArray(images) && images.length > 0 ? images : ["/no-image.svg"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("products")
        .insert([productPayload])
        .select()
        .single();

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message || "Error al insertar en la base de datos" }, { status: 500 });
      }

      // Guardar metadata extendida de Japón (Marca, tienda de Japón, URL original)
      try {
        const extrasFile = "_system/product_extras.json";
        let extrasMap: Record<string, any> = {};
        const { data: exFile } = await supabase.storage.from("product-images").download(extrasFile);
        if (exFile) {
          extrasMap = JSON.parse(await exFile.text() || "{}");
        }
        extrasMap[inserted.id] = {
          fulfillmentType: "japan_rakuten",
          brand: "Rakuten Japón (" + (shopName || "Importación") + ")",
          origin: "Japón 🎌",
          itemCode,
          rakutenUrl,
          priceJpy,
          importedAt: new Date().toISOString()
        };
        await supabase.storage.from("product-images").upload(extrasFile, Buffer.from(JSON.stringify(extrasMap, null, 2)), {
          contentType: "application/json",
          upsert: true
        });
      } catch (err) {
        console.warn("No se pudo guardar extras de Japón:", err);
      }

      return NextResponse.json({ success: true, product: inserted });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (err: any) {
    console.error("Error en POST de Rakuten Japón:", err);
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
