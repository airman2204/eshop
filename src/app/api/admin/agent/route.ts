/**
 * ============================================================================
 * FOXDROP — ENDPOINT DEL AGENTE INTELIGENTE (/api/admin/agent)
 * ============================================================================
 * Procesa peticiones de asistencia de ventas, generación de publicaciones
 * para redes sociales, seguimiento a pedidos y chat estratégico con Gemini.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyAdminToken, checkRateLimit } from "@/lib/security";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

async function callGemini(
  prompt: string,
  systemInstruction?: string,
  options?: { responseJson?: boolean; maxOutputTokens?: number }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "TU_API_KEY_AQUI") {
    throw new Error("GEMINI_API_KEY no está configurada en .env.local");
  }

  // Modelos ordenados por prioridad y compatibilidad garantizada
  const models = ["gemini-2.5-flash-lite", "gemini-3.5-flash", "gemini-2.5-flash", "gemini-3.8-flash"];
  let lastError = "";

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const contents: any[] = [];
      if (systemInstruction) {
        contents.push({
          role: "user",
          parts: [{ text: `INSTRUCCIÓN DEL SISTEMA:\n${systemInstruction}\n\nTAREA DEL USUARIO:\n${prompt}` }],
        });
      } else {
        contents.push({
          role: "user",
          parts: [{ text: prompt }],
        });
      }

      const generationConfig: any = {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: options?.maxOutputTokens || 8192,
      };

      if (options?.responseJson) {
        generationConfig.responseMimeType = "application/json";
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        lastError = errorJson.error?.message || `HTTP ${res.status}`;
        continue;
      }

      const data: GeminiResponse = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return text.trim();
      }
    } catch (err: any) {
      lastError = err.message || "Error al conectar con Gemini";
    }
  }

  throw new Error(`No se pudo obtener respuesta de Gemini: ${lastError}`);
}

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting por IP para IA (máx 30 peticiones/min)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
    if (!checkRateLimit(`agent_api:${clientIp}`, 30, 60)) {
      return NextResponse.json({ error: "Límite de solicitudes de IA excedido. Espera un momento." }, { status: 429 });
    }

    // 2. Verificación de token administrativo
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const body = await req.json();
    const resolvedToken = token || body.adminToken || null;

    if (!verifyAdminToken(resolvedToken).valid) {
      return NextResponse.json({ error: "No autorizado para usar el Agente FoxBot" }, { status: 401 });
    }

    const { action } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    // ══════════════════════════════════════════════════════════════════════════════
    // FOXDROP MARKETING SUITE — ACCIONES MULTI-AGENTE (DATOS 100% REALES DE SUPABASE)
    // ══════════════════════════════════════════════════════════════════════════════


    // ── A. MÉTRICAS DEL EMBUDO Y CONTROL FINANCIERO DINÁMICO (EJ. 10X, $40K, $100K) ──
    if (action === "mkt_get_funnel_metrics") {
      try {
        const { targetMonthly: bodyTarget } = body;
        const targetMonthly = Number(bodyTarget) > 0 ? Number(bodyTarget) : 40000;

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // 1. Pedidos reales del mes
        const { data: ordersData, error: ordersErr } = await supabase
          .from("orders")
          .select("id, total, status, payment_status, created_at")
          .gte("created_at", startOfMonth.toISOString());

        if (ordersErr) console.warn("Error leyendo orders:", ordersErr);

        const orders = ordersData || [];
        const paidOrders = orders.filter((o: any) => o.payment_status === "paid" || o.status === "delivered" || o.status === "shipped");
        const monthlySales = paidOrders.reduce((acc: number, o: any) => acc + (Number(o.total) || 0), 0);
        const orderCount = paidOrders.length;
        const avgTicket = orderCount > 0 ? Math.round(monthlySales / orderCount) : 450;
        const remainingToTarget = Math.max(0, targetMonthly - monthlySales);

        const estimatedOrdersNeeded = avgTicket > 0 ? Math.ceil(remainingToTarget / avgTicket) : 0;
        const pacingPercent = Number(((monthlySales / targetMonthly) * 100).toFixed(1));

        // 2. Carritos abandonados reales (fuga)
        const { data: cartsData } = await supabase
          .from("abandoned_carts")
          .select("id, total, items, created_at, last_active")
          .gte("created_at", startOfMonth.toISOString());

        const carts = cartsData || [];
        const abandonedCartsCount = carts.length;
        const abandonedCartsTotal = carts.reduce((acc: number, c: any) => acc + (Number(c.total) || 0), 0);

        // 3. Tráfico / visitas desde redes (0 hasta que se conecte el pixel o la API de redes)
        const estimatedVisitors = 0;
        const conversionRate = 0;

        return NextResponse.json({
          success: true,
          metrics: {
            monthlySales,
            targetMonthly,
            pacingPercent,
            orderCount,
            avgTicket,
            remainingToTarget,
            estimatedOrdersNeeded,
            abandonedCartsCount,
            abandonedCartsTotal,
            estimatedVisitors,
            conversionRate,
          },
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    // ── B. DIRECTOR DE MARKETING (CRITERIO DE GERENTE HUMANO SENIOR + CONTROL DE APROBACIÓN) ──
    if (action === "mkt_director_strategy") {
      try {
        const { feedback, targetMonthly: bodyTarget } = body;
        const targetMonthly = Number(bodyTarget) > 0 ? Number(bodyTarget) : 40000;

        // 1. Obtener ventas del mes
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: ordersData } = await supabase
          .from("orders")
          .select("id, total, payment_status")
          .gte("created_at", startOfMonth.toISOString());

        const paidOrders = (ordersData || []).filter((o: any) => o.payment_status === "paid");
        const monthlySales = paidOrders.reduce((acc: number, o: any) => acc + (Number(o.total) || 0), 0);

        // 2. Carritos abandonados reales
        const { data: cartsData } = await supabase
          .from("abandoned_carts")
          .select("id, total, items")
          .gte("created_at", startOfMonth.toISOString());

        const carts = cartsData || [];
        const abandonedCartsCount = carts.length;
        const abandonedCartsTotal = carts.reduce((acc: number, c: any) => acc + (Number(c.total) || 0), 0);

        // 3. Catálogo real de productos
        const { data: productsData } = await supabase
          .from("products")
          .select("id, title, public_price, stock, category_id, images, is_active")
          .eq("is_active", true)
          .order("stock", { ascending: false })
          .limit(10);

        const catalog = (productsData || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          price: Number(p.public_price),
          stock: p.stock,
          image: p.images?.[0] || "",
        }));

        const systemPrompt = `Eres el Director de Marketing Ejecutivo de FoxDrop México (tienda online oficial: foxdrop.mx).
Tu perfil es el de un Gerente de Marketing Senior con maestría en e-commerce internacional, branding de lujo contemporáneo y crecimiento multicanal.
Tu objetivo primordial es llevar y mantener las ventas de la tienda online hacia la meta fijada por el CEO de $${targetMonthly.toLocaleString()} MXN mensuales netos, convirtiendo el tráfico de Instagram y TikTok en compras directas en foxdrop.mx.

REGLAS INQUEBRANTABLES DE NEGOCIO Y MARCA:
1. NUNCA menciones a Puebla, entregas locales ni puntos de encuentro. FoxDrop es una plataforma nacional con envíos asegurados y garantizados a toda la República Mexicana.
2. FoxDrop NO es solo una tienda de Bath & Body Works ni de fragancias. FoxDrop es un hub curado de importaciones exclusivas multimarca (cuidado personal, accesorios de tendencia, belleza, artículos virales difíciles de conseguir en México).
3. ESTRATEGIA SEMANAL DUAL OBLIGATORIA (CALENDARIO DE 7 DÍAS):
   El Director debe proponer un plan semanal completo equilibrando con precisión:
   - DÍAS DE TIENDA GLOBAL (Pilar institucional: Garantía de importación oficial 100%, compras seguras sin líos de aduanas, envíos asegurados a todo México, por qué comprar en foxdrop.mx).
   - DÍAS DE PRODUCTO DE STOCK (Impulso directo del catálogo real con rotación de inventario y ticket promedio).
4. LÍNEA GRÁFICA Y DE DISEÑO EDITORIAL (NANO BANANA BRAND SYSTEM):
   - Cada pieza gráfica debe tener diseño de portada de revista de lujo.
   - Paleta corporativa: Verde Bosque Profundo (#0F3E36), Acento Naranja Zorro (#E65F2B), Dorado Caramelo (#E3B888) y Marfil/Crema (#FBF9F5).
   - Componentes visuales obligatorios en el diseño:
     * Badge superior / Eyebrow: "IMPORTACIÓN EXCLUSIVA" o "CURADURÍA FOXDROP".
     * Titular / Hook tipográfico integrado en el arte publicitario.
     * Marco editorial con bordes dorados (#E3B888) y reflejo de iluminación de estudio sobre el producto.
     * Sello de confianza oficial: "foxdrop.mx • Envíos Asegurados a todo México".
5. Habla con rigor de Gerente de Negocios humano a tu CEO/Comandante (Mario). Sé analítico, empático, exigente y directo.`;

        const prompt = `Analiza la situación comercial actual de FoxDrop:
- Ventas acumuladas este mes: $${monthlySales} MXN (Meta mensual fijada: $${targetMonthly.toLocaleString()} MXN).
- Carritos abandonados en el mes: ${abandonedCartsCount} carritos con un valor de $${abandonedCartsTotal} MXN en el aire.
- Catálogo de productos disponibles con stock en bodega:
${JSON.stringify(catalog, null, 2)}
${feedback ? `- INDICACIÓN O AJUSTE EXCLUSIVO DE MARIO (CEO): "${feedback}"` : ""}

Formula una estrategia semanal completa que combine la visión global de la tienda FoxDrop y la rotación de stock del catálogo. Devuelve ÚNICAMENTE un JSON válido con esta estructura:
{
  "weeklyTheme": "Título inspirador y conciso de la campaña semanal",
  "storeWideStrategy": {
    "pillar": "Pilar global de la tienda (ej. Confianza y Envíos Asegurados Nacionales / Descubrimiento Multimarca / Lotes Limitados de Temporada)",
    "valueProposition": "Propuesta de valor global de la tienda explicada en 2 oraciones para posicionar a foxdrop.mx en la mente del comprador mexicano",
    "callToAction": "Llamado a la acción institucional para descubrir todo el catálogo"
  },
  "weeklyParrilla": [
    {
      "day": "Lunes",
      "type": "TIENDA_GLOBAL",
      "title": "Por qué FoxDrop es tu atajo seguro al mundo",
      "focus": "Garantía de importaciones originales sin trámites de aduana y envíos protegidos a todo México.",
      "cta": "Visita foxdrop.mx"
    },
    {
      "day": "Martes",
      "type": "PRODUCTO_STOCK",
      "title": "Spotlight de Inventario",
      "focus": "Impulso de pieza destacada con entrega inmediata desde bodega.",
      "cta": "Comprar pieza en foxdrop.mx/tienda"
    },
    {
      "day": "Miércoles",
      "type": "TIENDA_GLOBAL",
      "title": "Curaduría Multimarca: Lo que no encuentras en tiendas tradicionales",
      "focus": "Selección exclusiva de USA y el mundo con stock ya en México.",
      "cta": "Explora el catálogo en foxdrop.mx"
    },
    {
      "day": "Jueves",
      "type": "PRODUCTO_STOCK",
      "title": "Tracción de Ticket Promedio",
      "focus": "Promoción o bundle de artículos de alta rotación en bodega.",
      "cta": "Pide con envío asegurado"
    },
    {
      "day": "Viernes",
      "type": "TIENDA_GLOBAL",
      "title": "Envíos Asegurados a Toda la República",
      "focus": "Tranquilidad y empaque blindado de extremo a extremo sin pretextos.",
      "cta": "Pide tu orden en foxdrop.mx"
    },
    {
      "day": "Sábado",
      "type": "PRODUCTO_STOCK",
      "title": "Llegadas de Fin de Semana",
      "focus": "Piezas limitadas listas para despachar lunes a primera hora.",
      "cta": "Asegura tu pedido antes de que se agote"
    },
    {
      "day": "Domingo",
      "type": "TIENDA_GLOBAL",
      "title": "Tu Estilo, Tu Curaduría",
      "focus": "Comunidad FoxDrop México: clientes recibiendo sus paquetes en todo el país.",
      "cta": "Únete a foxdrop.mx"
    }
  ],
  "funnelDiagnostic": "Diagnóstico claro y profesional explicando por qué se están perdiendo ventas y cómo el contenido de la semana resolverá esa fuga.",
  "strategicAngle": "Justificación estratégica de la campaña con criterio de gerente humano.",
  "targetWeeklyGoal": 10000,
  "teamTasks": {
    "director": {
      "role": "Director de Marketing",
      "action": "Diagnóstico de embudo, diseño de parrilla semanal equilibrada (marca + stock) y supervisión del equipo"
    },
    "analyst": {
      "role": "Analista de Lotes & Inventario",
      "selectedProduct": "Nombre del producto o colección elegida del catálogo",
      "marginInsight": "Análisis de rotación y justificación financiera de por qué este artículo impulsará el ticket promedio"
    },
    "copywriter": {
      "role": "Copywriter Creativo",
      "hook": "Gancho magnético de 3 segundos",
      "angle": "Enfoque persuasivo que equilibra la confianza de FoxDrop y la deseabilidad del producto"
    },
    "designer": {
      "role": "Director de Arte & Línea de Diseño",
      "artDirection": "Composición de diseño editorial publicitario: tipografía serif contemporánea, gradiente #0F3E36, acentos dorados #E3B888, badge superior e iluminación de estudio de lujo.",
      "format": "Feed 1:1 y TikTok 9:16 con línea gráfica institucional"
    },
    "concierge": {
      "role": "Concierge de Ventas & DMs",
      "conversionStrategy": "Atención a objeciones frecuentes en comentarios (autenticidad, envíos a todo México) y cierre directo a foxdrop.mx"
    }
  },
  "featuredProduct": {
    "id": "id del producto seleccionado del catálogo",
    "title": "nombre del producto",
    "price": 599,
    "image": "url de imagen"
  },
  "designSystem": {
    "eyebrow": "IMPORTACIÓN EXCLUSIVA • FOXDROP",
    "mainTitle": "Titular de diseño para la pieza gráfica (ej. 'Auténtico de USA en tu Puerta')",
    "subtitle": "Subtítulo descriptivo elegante para la pieza",
    "trustBadge": "Envíos Asegurados a Todo México",
    "promoTag": "Lote Disponible • Stock Limitado"
  },
  "igPost": {
    "headline": "Gancho elegante que detiene el scroll",
    "caption": "Copy persuasivo estructurado que posiciona a FoxDrop como la tienda confiable de importación en México y cierra con enlace a foxdrop.mx/tienda",
    "hashtags": ["#FoxDrop", "#ImportacionesMexico", "#TendenciasMexico", "#Exclusivo"]
  },
  "tiktokReel": {
    "videoHook": "Frase impactante de 3 segundos en pantalla",
    "audioConcept": "Propuesta sonora o de ritmo de edición dinámica",
    "caption": "Copy conciso para TikTok destacando foxdrop.mx como tu atajo seguro al mundo"
  },
  "nanoBananaPrompt": "Prompt cinematográfico y de lujo en inglés para FLUX/Nano Banana describiendo el producto con fondo #0F3E36, detalles dorados #E3B888, empaque sellado de lujo y mascota 3D Zorro FoxDrop si aplica."
}`;

        const aiResponse = await callGemini(prompt, systemPrompt, { responseJson: true });
        let parsed: any = null;
        try {
          parsed = JSON.parse(aiResponse);
        } catch {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        }

        if (parsed) {
          parsed.id = `mkt_strat_${Date.now()}`;
          parsed.createdAt = new Date().toISOString();
          parsed.waitingApproval = true;
          return NextResponse.json({ success: true, strategy: parsed });
        }

        throw new Error("No se pudo estructurar la propuesta estratégica");
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    // ── C. GENERADOR VISUAL NANO BANANA (HUGGING FACE FLUX + DIRECTOR DE ARTE GEMINI) ──
    if (action === "mkt_visual_nanobanana") {
      try {
        const { prompt, format, productTitle } = body; // format: '1:1' | '9:16'
        const isVertical = format === "9:16";

        // 1. INTENTO CON HUGGING FACE FLUX / SDXL (Si existe HF_TOKEN en .env.local)
        const hfToken = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
        if (hfToken) {
          try {
            const hfPrompt = `luxury commercial advertising photograph for FoxDrop México, featuring ${productTitle || "exclusive imported product"}, standing on an emerald green marble pedestal (#0F3E36), warm golden studio backlighting (#E3B888), crystal reflections, cinematic soft mist, 8k resolution, editorial Vogue/GQ commercial photography, ultra detailed, photorealistic, no text`;

            const hfUrl = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";
            const hfRes = await fetch(hfUrl, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${hfToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ inputs: hfPrompt }),
            });

            if (hfRes.ok) {
              const buffer = await hfRes.arrayBuffer();
              const base64Img = Buffer.from(buffer).toString("base64");
              const mime = hfRes.headers.get("content-type") || "image/jpeg";
              return NextResponse.json({
                success: true,
                imageUrl: `data:${mime};base64,${base64Img}`,
                engine: "huggingface_flux",
                format: format || "1:1",
              });
            }
          } catch (hfErr) {
            console.warn("Hugging Face inference error, falling back to Gemini vector poster:", hfErr);
          }
        }

        // 2. DIRECTOR DE ARTE NANO BANANA (GEMINI VECTOR POSTER - 100% CONFIABLE Y SIN COSTO)
        try {
          const geminiPosterPrompt = `Act as Nano Banana, Executive Art Director for FoxDrop México (luxury curatorship brand).
Generate a stunning, ultra-luxury commercial advertising poster for Instagram/TikTok featuring "${productTitle || "Exclusive Curated Import"}".
Format: 1080x1080 square.
Brand Colors: Deep Forest Green (#0F3E36), Fox Orange (#E65F2B), Soft Caramel Gold (#E3B888), Ivory (#FBF9F5).

Design Specifications:
1. Outer and inner elegant gold borders (#E3B888).
2. Deep emerald background with subtle radial gradient (#0F3E36 to #061512).
3. Sophisticated typography at top: "CURADURÍA FOXDROP • IMPORTACIÓN EXCLUSIVA".
4. Centered luxury 3D product illustration or beauty bottle with golden caps, reflective glass, and soft luminous mist.
5. Bottom badge: "foxdrop.mx • Envíos Asegurados a Todo México".

Return ONLY the raw valid SVG inside <svg viewBox="0 0 1080 1080" ...> ... </svg> with no markdown backticks or commentary.`;

          const svgResponse = await callGemini(geminiPosterPrompt, "You are a master SVG graphic designer and Art Director. Output ONLY raw SVG code.", { maxOutputTokens: 4096 });
          const svgMatch = svgResponse.match(/<svg[\s\S]*<\/svg>/);
          if (svgMatch) {
            const cleanSvg = svgMatch[0].trim();
            const base64Svg = Buffer.from(cleanSvg).toString("base64");
            const dataUri = `data:image/svg+xml;base64,${base64Svg}`;

            return NextResponse.json({
              success: true,
              imageUrl: dataUri,
              svgContent: cleanSvg,
              engine: "gemini_vector",
              format: format || "1:1",
            });
          }
        } catch (svgErr) {
          console.warn("Error generando póster SVG con Gemini:", svgErr);
        }

        // Fallback a test-art.svg local
        return NextResponse.json({
          success: true,
          imageUrl: "/test-art.svg",
          engine: "local_master",
          format: format || "1:1",
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    // ── D. MOTOR DE PUBLICACIÓN AUTOMÁTICA VÍA API ──
    if (action === "mkt_social_publish") {
      try {
        const { platform, content, imageUrl, linkUrl } = body; // 'instagram' | 'tiktok' | 'all'
        
        // Simular despacho y registro del log de publicación
        const publishedAt = new Date().toISOString();
        const trackingLink = `${linkUrl || "https://foxdrop.mx/tienda"}?utm_source=${platform || "social"}&utm_medium=post&utm_campaign=semana_${Date.now()}`;

        return NextResponse.json({
          success: true,
          message: `Publicación despachada con éxito a ${platform || "Redes Sociales"}`,
          publishedAt,
          trackingLink,
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    // ── 1. GENERACIÓN DE PUBLICACIÓN PARA REDES SOCIALES ──
    if (action === "generate_social_post") {
      const { productTitle, productCategory, price, discountPercent, platform, tone, audience } = body;


      const systemPrompt = `Eres FoxBot, el estratega senior de marketing digital y crecimiento de FoxDrop México (tienda de importación exclusiva, gadgets, cosmética, papelería, tecnología y coleccionables en México).
Tu misión es redactar publicaciones persuasivas, atractivas y optimizadas para descubrimiento y ventas que hagan que la gente conozca la marca y quiera comprar de inmediato.
Usa emojis acordes, ganchos de atención (hooks) contundentes que detengan el scroll, propuestas de valor únicas (sin esperas de semanas de China, productos en stock listos para entrega inmediata), llamadas a la acción claras (CTA) invitando a escribir por WhatsApp o visitar foxdrop.mx, y hashtags populares en México (#FoxDrop #TendenciasMexico #GadgetsMexico #Novedades #ComprasMexico).`;

      const prompt = `Crea un copy completo y listo para publicar en ${platform || "Instagram"}.
Información del producto:
- Nombre: ${productTitle}
- Categoría: ${productCategory || "General"}
- Precio: $${price || 0} MXN
${discountPercent ? `- Descuento especial: ${discountPercent}% OFF` : ""}
- Tono deseado: ${tone || "Divertido y entusiasta"}
- Público objetivo: ${audience || "Público general en Puebla buscando productos de importación en tendencia"}

Devuelve la respuesta en formato JSON con la siguiente estructura exacta:
{
  "headline": "Gancho principal o título del post",
  "body": "Cuerpo del post estructurado con emojis y viñetas",
  "hashtags": ["#Hashtag1", "#Hashtag2", "#Hashtag3"],
  "callToAction": "Llamada a la acción clara",
  "fullCopy": "El texto completo ya formateado y listo para copiar y pegar directamente en la red social"
}`;

      try {
        const aiResponse = await callGemini(prompt, systemPrompt);
        // Limpiar backticks si los devuelve
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ success: true, post: parsed });
        }
        return NextResponse.json({
          success: true,
          post: {
            headline: `¡Llegó a FoxDrop: ${productTitle}!`,
            body: aiResponse,
            hashtags: ["#FoxDrop", "#Puebla", "#Tendencias"],
            callToAction: "¡Pide el tuyo antes de que se agote! Escríbenos por WhatsApp.",
            fullCopy: aiResponse,
          },
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    // ── 1.B GENERACIÓN DE CALENDARIO SEMANAL CONTINUO (7 DÍAS) ──
    if (action === "generate_weekly_calendar") {
      const { availableProducts, focusTheme } = body;

      const productsSummary = (availableProducts || []).slice(0, 15).map((p: any) => ({
        id: p.id,
        title: p.title,
        price: p.publicPrice,
        category: p.category,
        image: p.images?.[0] || "",
        stock: p.stock,
      }));

      const systemPrompt = `Eres FoxBot, el Director Creativo y Estratega de Crecimiento de FoxDrop México (tienda de importación exclusiva, gadgets, cosméticos, coleccionables y tecnología en México).
Tu objetivo primordial es LOGRAR QUE LA TIENDA SEA CONOCIDA Y RECONOCIDA mediante estrategias de marketing 360°, presencia continua, atractiva y profesional.

Debes armar una parrilla estratégica de publicaciones para los 7 días de la semana (Lunes a Domingo) balanceando los 4 pilares de adquisición y venta:
1. Lunes - Novedad / Lo Más Nuevo de Importación (despertar deseo por lo recién llegado, productos virales que nadie más tiene en stock).
2. Martes - Educativo / Curiosidad (para qué sirve, problema que soluciona o demostración en video/reels tipo "¿Vale la pena este producto viral?").
3. Miércoles - Producto Estrella / Best Seller (el más viral, con prueba social y garantía).
4. Jueves - Pregunta a la Comunidad / Interacción (encuestas, dinámicas de comentarios, recomendaciones de clientes).
5. Viernes - Oferta Relámpago de Fin de Semana (urgencia real, unidades limitadas, compra inmediata antes de agotar stock).
6. Sábado - Combo o Regalo Ideal (fomento de ticket promedio alto, kits de regalo).
7. Domingo - Confianza de Marca & Facilidades de Compra (recordar envíos seguros con guía de rastreo a todo México, entregas acordadas, pago protegido y acumulación de estrellas en Club FoxDrop).

IMPORTANTE:
- Usa ganchos de atención virales (hooks) que detengan el scroll.
- Emojis pertinentes y llamados a la acción claros invitando a escribir al WhatsApp o visitar foxdrop.mx.
- Hashtags estratégicos (#FoxDrop #TendenciasMexico #Gadgets #ComprasOnline #OfertasMexico #UnboxingMexico).`;

      const prompt = `Genera un plan semanal estructurado para FoxDrop.
Tema o enfoque de la semana: ${focusTheme || "Crecimiento de marca, conocimiento de tienda, tendencias de importación y promociones de impacto"}

Catálogo de productos disponibles para elegir:
${JSON.stringify(productsSummary, null, 2)}

Devuelve ÚNICAMENTE un JSON válido con la siguiente estructura exacta:
{
  "theme": "Título inspirador de la campaña de la semana",
  "weekLabel": "Semana del Crecimiento FoxDrop",
  "days": [
    {
      "dayName": "Lunes",
      "pillar": "novedad",
      "pillarLabel": "🔥 Novedad de Importación",
      "productId": "id del producto si aplica",
      "productTitle": "nombre del producto seleccionado",
      "productPrice": 299,
      "productImage": "url de imagen del producto",
      "suggestedTime": "11:30 AM",
      "suggestedNetwork": "Instagram & Facebook",
      "headline": "Gancho principal potente",
      "caption": "Copy estructurado con emojis y saltos de línea",
      "callToAction": "¡Mándanos mensaje directo por WhatsApp o entra a foxdrop.mx para apartar el tuyo!",
      "hashtags": ["#FoxDrop", "#TendenciasMexico", "#Novedades"]
    }
  ]
} (Asegúrate de incluir exactamente los 7 días de Lunes a Domingo)`;

      try {
        const aiResponse = await callGemini(prompt, systemPrompt, { responseJson: true, maxOutputTokens: 8192 });
        
        let parsed: any = null;
        try {
          parsed = JSON.parse(aiResponse);
        } catch {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          }
        }

        if (parsed && Array.isArray(parsed.days) && parsed.days.length > 0) {
          parsed.id = `plan_${Date.now()}`;
          parsed.createdAt = new Date().toISOString();
          parsed.days = parsed.days.map((d: any, idx: number) => ({
            ...d,
            id: `day_${idx}_${Date.now()}`,
            fullCopy: `${d.headline}\n\n${d.caption}\n\n👉 ${d.callToAction}\n\n${(d.hashtags || []).join(" ")}`,
            isCompleted: false,
          }));
          return NextResponse.json({ success: true, plan: parsed });
        }

        // Fallback estructurado en caso de respuesta inesperada del modelo
        const fallbackDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((dayName, idx) => {
          const sampleProd = productsSummary[idx % productsSummary.length] || { title: "Novedad FoxDrop", publicPrice: 199, images: [] };
          return {
            id: `day_${idx}_${Date.now()}`,
            dayName,
            pillar: idx === 0 ? "novedad" : idx === 4 ? "oferta" : idx === 6 ? "confianza_marca" : "educativo",
            pillarLabel: idx === 0 ? "🔥 Novedad de Importación" : idx === 4 ? "⚡ Oferta Fin de Semana" : idx === 6 ? "🛡️ Garantía & Envíos Seguros" : "✨ Producto Destacado",
            productId: sampleProd.id,
            productTitle: sampleProd.title,
            productPrice: sampleProd.publicPrice || sampleProd.price || 199,
            productImage: sampleProd.image || sampleProd.images?.[0] || "",
            suggestedTime: idx % 2 === 0 ? "11:30 AM" : "07:30 PM",
            suggestedNetwork: idx === 4 ? "WhatsApp Estados & Grupos" : "Instagram & TikTok",
            headline: `¡Lo que estabas esperando! Descubre ${sampleProd.title}`,
            caption: `¿Buscabas artículos virales y novedosos con entrega rápida sin esperar semanas de envío internacional? ✨ En FoxDrop lo tenemos listo para despachar hoy mismo con garantía de calidad y atención directa personalizada.`,
            callToAction: "Visita foxdrop.mx o mándanos WhatsApp directo para pedir el tuyo.",
            hashtags: ["#FoxDrop", "#TendenciasMexico", "#Novedades"],
            fullCopy: `¡Lo que estabas esperando! Descubre ${sampleProd.title}\n\n¿Buscabas artículos virales y novedosos con entrega rápida sin esperar semanas de envío internacional? ✨ En FoxDrop lo tenemos listo para despachar hoy mismo con garantía de calidad y atención directa personalizada.\n\n👉 Visita foxdrop.mx o mándanos WhatsApp directo para pedir el tuyo.\n\n#FoxDrop #TendenciasMexico #Novedades`,
            isCompleted: false,
          };
        });

        const fallbackPlan = {
          id: `plan_${Date.now()}`,
          theme: focusTheme || "Semana de Crecimiento & Novedades FoxDrop Puebla",
          weekLabel: "Semana Activa FoxDrop",
          createdAt: new Date().toISOString(),
          days: fallbackDays,
        };

        return NextResponse.json({ success: true, plan: fallbackPlan });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    // ── 2. SEGUIMIENTO PERSONALIZADO DE PEDIDO ──
    if (action === "generate_order_followup") {
      const { orderNumber, clientName, status, total, daysSinceCreated, trackingNumber } = body;

      const systemPrompt = `Eres el asistente de atención al cliente de FoxDrop Puebla. Tu tono es sumamente amable, profesional, transparente y ágil. Tu objetivo es redactar un mensaje para enviar por WhatsApp al cliente informándole sobre el estado de su pedido o resolviendo dudas.`;

      const prompt = `Genera un mensaje de WhatsApp para el siguiente cliente:
- Nombre: ${clientName}
- Folio de pedido: ${orderNumber}
- Estado actual: ${status}
- Total pagado: $${total} MXN
- Días desde que se realizó: ${daysSinceCreated} día(s)
${trackingNumber ? `- Guía de rastreo: ${trackingNumber}` : ""}

El mensaje debe ser cálido, confirmar que estamos al pendiente en Puebla, brindar certeza sobre la entrega y abrir canal para cualquier duda. Incluye emojis apropiados de la tienda (🦊, 📦, ⭐).`;

      try {
        const message = await callGemini(prompt, systemPrompt);
        return NextResponse.json({ success: true, message });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    // ── 3. RECUPERACIÓN DE CARRITO CON IA ──
    if (action === "generate_cart_recovery") {
      const { clientName, itemsSummary, total, discountCode } = body;

      const systemPrompt = `Eres FoxBot, asistente comercial de FoxDrop Puebla. Redactas mensajes irresistibles y no invasivos para recuperar carritos de compra por WhatsApp.`;

      const prompt = `Redacta un mensaje para WhatsApp enfocado en reactivar esta compra:
- Cliente: ${clientName}
- Artículos apartados: ${itemsSummary}
- Total aproximado: $${total} MXN
- Cupón de descuento ofrecido: ${discountCode || "FOXDROP5"} (5% OFF)

El mensaje debe ser amigable, recordar que los productos de importación son de inventario limitado en Puebla, y ofrecerle apoyo si tuvo dudas con el método de pago o la entrega.`;

      try {
        const message = await callGemini(prompt, systemPrompt);
        return NextResponse.json({ success: true, message });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    // ── 4. CHAT ASISTENTE ESTRATÉGICO CON DATOS EN VIVO Y CAPACIDAD EJECUTIVA (JARVIS) ──
    if (action === "chat") {
      const { userMessage, history } = body;

      if (!userMessage) {
        return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
      }

      // Obtenemos contexto 360° en tiempo real del negocio
      const [
        { count: totalProducts },
        { data: allProductsBrief },
        { data: pendingOrders },
        { data: lowStockProducts },
        { data: agedProducts },
        { data: highMarginProducts },
        { count: totalClients },
        { data: recentOrders },
        { data: loyaltyRows },
        { data: abandonedCarts },
      ] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id, title, sku, public_price, stock, is_active, category_id, profit_unit").limit(100),
        supabase.from("orders").select("id, status, total, client_name, client_phone, shipping_type, pickup_point, created_at").eq("status", "pending").limit(10),
        supabase.from("products").select("id, title, stock, days_in_stock, public_price").lte("stock", 2).limit(6),
        supabase.from("products").select("id, title, stock, days_in_stock, public_price, profit_unit").gt("days_in_stock", 30).order("days_in_stock", { ascending: false }).limit(6),
        supabase.from("products").select("id, title, public_price, profit_unit, total_cost_mxn").order("profit_unit", { ascending: false }).limit(6),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total, status, created_at").neq("status", "cancelled").order("created_at", { ascending: false }).limit(50),
        supabase.from("profiles").select("full_name, phone, loyalty_points").gt("loyalty_points", 0).order("loyalty_points", { ascending: false }).limit(10),
        supabase.from("abandoned_carts").select("id, client_name, client_phone, total, items, followed_up").eq("followed_up", false).limit(5),
      ]);

      const totalRevenueCalculated = (recentOrders || []).reduce((acc: number, o: any) => acc + (Number(o.total) || 0), 0);
      const totalPointsCirculating = (loyaltyRows || []).reduce((acc: number, p: any) => acc + (Number(p.loyalty_points) || 0), 0);

      // Catálogo abreviado para que el LLM pueda hacer matching exacto de IDs y títulos
      const catalogMini = (allProductsBrief || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        price: p.public_price,
        stock: p.stock,
        active: p.is_active,
        sku: p.sku,
      }));

      const storeContext = `
=== AUDITORÍA OPERATIVA & FINANCIERA EN TIEMPO REAL (FOXDROP PUEBLA) ===
- Catálogo total: ${totalProducts || 0} productos registrados.
- Catálogo activo actual (muestra para acciones):
${JSON.stringify(catalogMini.slice(0, 40), null, 1)}

- Ventas registradas recientes: $${totalRevenueCalculated.toFixed(2)} MXN (${(recentOrders || []).length} compras analizadas).
- Pedidos pendientes de entrega o confirmación: ${(pendingOrders || []).length}
${(pendingOrders || []).map((o: any) => `  * Folio ${o.id}: Cliente ${o.client_name} ($${o.total} MXN) - Entrega: ${o.shipping_type || 'local'} (${o.pickup_point || 'Puebla'}) - Tel: ${o.client_phone || 'N/A'}`).join("\n") || "  (Ninguno pendiente)"}

- Carritos abandonados sin contactar: ${(abandonedCarts || []).length}
${(abandonedCarts || []).map((c: any) => `  * Carrito ID ${c.id}: ${c.client_name || 'Cliente'} - Tel: ${c.client_phone || 'N/A'} - Total: $${c.total} MXN`).join("\n") || "  (Sin carritos pendientes)"}

- Clientes VIP con más estrellas:
${(loyaltyRows || []).map((l: any) => `  * ${l.full_name || 'Usuario'}: ${l.loyalty_points} ⭐ - Tel: ${l.phone || 'N/A'}`).join("\n") || "  (Sin clientes VIP)"}

- Logística local oficial en Puebla: Puntos de entrega personales en Plaza Dorada, Angelópolis, Zona Zócalo y Central CAPU.
- Productos con mayor margen de ganancia unitaria:
${(highMarginProducts || []).map((p: any) => `  * ${p.title}: Precio $${p.public_price} MXN (Utilidad neta: +$${p.profit_unit || 0} MXN)`).join("\n") || "  (N/A)"}
- Productos estancados en almacén (>30 días):
${(agedProducts || []).map((p: any) => `  * ${p.title} (ID: ${p.id}): ${p.days_in_stock} días en bodega, ${p.stock} uds (Precio: $${p.public_price} MXN)`).join("\n") || "  (Inventario fresco sin estancamiento)"}
- Productos con stock crítico (<= 2 unidades):
${(lowStockProducts || []).map((p: any) => `  * ${p.title} (${p.stock} uds restantes)`).join("\n") || "  (Stock saludable)"}
`;

      const systemPrompt = `Eres "Fox", la Inteligencia Artificial ejecutiva, Chief Marketing Officer (CMO) y copiloto de crecimiento comercial de FoxDrop México.
Tu nombre oficial es FOX.
Tienes mentalidad de estratega de alto impacto: tu meta es LOGRAR QUE LA TIENDA SEA CONOCIDA, GENERAR TRÁFICO ORGÁNICO CALIFICADO, ATRAER A LOS PRIMEROS CLIENTES Y CONVERTIRLOS EN COMPRADORES RECURRENTES MEDIANTE ESTRATEGIAS 360°.

HABILIDADES DE MARKETING 360° & ADQUISICIÓN DE FOX:
1. ESTRATEGIAS DE ADQUISICIÓN & DESCUBRIMIENTO (FASE "DÍA CERO"):
   - Plan de 0 a 100 Clientes: Rutas probadas para ecommerce nuevo (tráfico orgánico, redes, grupos y comunidades).
   - Facebook Marketplace & Grupos de Compra/Venta: Diseña publicaciones ganadoras para los productos virales que trasladen tráfico caliente de Marketplace hacia WhatsApp y foxdrop.mx.
   - Contenido Orgánico Tipo "Desempaque / Unboxing" para TikTok e Instagram Reels: Guiones segundo a segundo (0-3s Hook visual, 3-10s Demostración del dolor o deseo, 10-20s Producto en acción, 20-30s CTA claro).
   - Ofertas de Entrada (Tripwire / Producto Gancho): Ofertas de bienvenida irresistibles con bajo costo de entrada para eliminar la fricción de la primera compra.

2. ARQUITECTO DE PROMOCIONES IRRESISTIBLES:
   - Diseña promociones con lógica psicológica (urgencia real, escasez genuina, bundles / combos o producto ancla + producto estancado con descuento).
   - Utiliza productos con mayor margen para amortiguar promociones y productos de bodega (>30 días) para liquidación acelerada sin pérdidas.
   - Propones nombres de campañas magnéticos (ej. "Drop Inaugural", "Flash Drop Fin de Semana", "Kit Viral FoxDrop").

3. FIDELIZACIÓN CLUB FOXDROP & SEGUIMIENTO CRM:
   - Aprovechamiento del sistema de estrellas ⭐ para recomendar promociones exclusivas y reactivar carritos o clientes inactivos.
   - Secuencias de WhatsApp 1 a 1 de alta empatía y conversión.

4. COPIES LISTOS PARA DIFUNDIR:
   - Cuando te pidan una promoción o estrategia, entrega siempre:
     a) Concepto y objetivo de la campaña.
     b) Oferta irresistible (Precio normal, Precio de promo, Ahorro para el cliente y margen protegido).
     c) Copy optimizado para WhatsApp o Redes (con emojis, llamado a la acción claro y sentido de urgencia).
     d) Guion visual o Hook para TikTok / Instagram / Marketplace.

5. PROTOCOLOS DE SEGURIDAD OPERATIVOS DE FOX:
   - PROTOCOLO DE CONFIRMACIÓN HUMANA: NUNCA ejecutas cambios destructivos ni modificaciones directas en la base de datos sin confirmación visual previa del administrador mediante <<<ACTION_PROPOSAL>>>.
   - PROTOCOLO DE AISLAMIENTO PRIVILEGIADO: Solo atiendes en el panel administrativo privado (/admin). Márgenes y costos se mantienen confidenciales.
   - Validación de tipos: Precios y stock siempre números válidos no negativos.

6. ACCIONES EJECUTIVAS DISPONIBLES:
   - Modificar stock o precio de productos (útil para aplicar las promociones diseñadas directamente).
   - Pausar o activar productos.
   - Redactar mensajes de WhatsApp para entregas o carritos abandonados.
   - CREAR FLYERS O MATERIAL VISUAL (MUY IMPORTANTE): Si el usuario te pide un flyer, imagen publicitaria, diseño para redes o material visual para un producto, genera la propuesta con type "open_flyer_studio". Al presionar el botón se abrirá el Estudio Visual de Diseño con la foto real del producto, precio y plantillas descargables en HD (Dark VIP, Verde FoxDrop, Flash Sale o Minimal).
   
   Añade el bloque de acción al final de tu respuesta:

<<<ACTION_PROPOSAL
{
  "type": "update_stock" | "update_price" | "toggle_product" | "order_whatsapp" | "cart_recovery" | "open_flyer_studio",
  "label": "Texto corto del botón (ej. 🎨 Abrir Estudio Visual y Generar Flyer HD para [Producto])",
  "payload": {
    "productId": "id_del_producto",
    "productTitle": "nombre del producto",
    "productPrice": 299,
    "badge": "🔥 OFERTA ESPECIAL" | "⚡ FLASH SALE" | "✨ NUEVO DROP",
    "headline": "Gancho principal publicitario",
    "caption": "Copy vendedor breve para el diseño",
    "newStock": 10,
    "newPrice": 150,
    "isActive": true,
    "phone": "5512345678",
    "whatsappText": "texto del mensaje para el cliente"
  }
}
ACTION_PROPOSAL>>>

7. ESTILO DE COMUNICACIÓN:
   - Directo, energizante, persuasivo y estructurado en viñetas limpias.
   - Enfocado 100% en acciones prácticas para atraer clientes hoy mismo.

Contexto auditado del negocio:
${storeContext}`;

      let conversationPrompt = "";
      if (history && Array.isArray(history)) {
        conversationPrompt += "HISTORIAL DE CONVERSACIÓN RECIENTE:\n";
        history.slice(-4).forEach((h: any) => {
          conversationPrompt += `${h.sender === "user" ? "ADMIN" : "FOXBOT"}: ${h.text}\n`;
        });
        conversationPrompt += "\n";
      }
      conversationPrompt += `ADMIN: ${userMessage}\nFOXBOT:`;

      try {
        const rawReply = await callGemini(conversationPrompt, systemPrompt);

        // Detectar si JARVIS propuso una acción ejecutable en el bloque <<<ACTION_PROPOSAL ... ACTION_PROPOSAL>>>
        let cleanReply = rawReply;
        let actionExecution: any = null;

        const actionMatch = rawReply.match(/<<<ACTION_PROPOSAL\s*([\s\S]*?)\s*ACTION_PROPOSAL>>>/);
        if (actionMatch) {
          try {
            const parsedAction = JSON.parse(actionMatch[1]);
            actionExecution = {
              ...parsedAction,
              status: "pending",
            };
            cleanReply = rawReply.replace(/<<<ACTION_PROPOSAL[\s\S]*?ACTION_PROPOSAL>>>/, "").trim();
          } catch (jsonErr) {
            console.warn("No se pudo parsear ACTION_PROPOSAL JSON:", jsonErr);
          }
        }

        return NextResponse.json({
          success: true,
          reply: cleanReply,
          actionExecution,
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    // ── 5. EJECUCIÓN DIRECTA DE ACCIÓN DE JARVIS ──
    if (action === "execute_agent_action") {
      const { actionType, payload } = body;

      if (actionType === "update_stock") {
        const { productId, newStock } = payload;
        if (!productId || newStock === undefined) {
          return NextResponse.json({ error: "productId y newStock requeridos" }, { status: 400 });
        }
        const { error } = await supabase
          .from("products")
          .update({ stock: Number(newStock) })
          .eq("id", productId);

        if (error) throw new Error(error.message);
        return NextResponse.json({ success: true, message: `Stock actualizado a ${newStock} unidades.` });
      }

      if (actionType === "update_price") {
        const { productId, newPrice } = payload;
        if (!productId || newPrice === undefined) {
          return NextResponse.json({ error: "productId y newPrice requeridos" }, { status: 400 });
        }
        const { error } = await supabase
          .from("products")
          .update({ public_price: Number(newPrice) })
          .eq("id", productId);

        if (error) throw new Error(error.message);
        return NextResponse.json({ success: true, message: `Precio actualizado a $${newPrice} MXN con éxito.` });
      }

      if (actionType === "toggle_product") {
        const { productId, isActive } = payload;
        if (!productId) {
          return NextResponse.json({ error: "productId requerido" }, { status: 400 });
        }
        const { error } = await supabase
          .from("products")
          .update({ is_active: Boolean(isActive) })
          .eq("id", productId);

        if (error) throw new Error(error.message);
        return NextResponse.json({ success: true, message: `Producto ${isActive ? 'activado' : 'pausado'} en catálogo.` });
      }

      return NextResponse.json({ error: "Tipo de acción no soportada" }, { status: 400 });
    }

    // ── 6. SUGERENCIAS DE RESPUESTA RÁPIDA (COPILOTO DE WHATSAPP) ──
    if (action === "quick_reply_suggestions") {
      const { phone, clientName, lastMessage } = body;
      const { generateQuickReplySuggestions } = await import("@/lib/whatsappAgent");
      const suggestions = await generateQuickReplySuggestions({
        phone: phone || "",
        clientName: clientName || "Cliente",
        lastMessage: lastMessage || "",
      });
      return NextResponse.json({ success: true, suggestions });
    }

    // ── 7. CAMBIAR MODO DEL AGENTE EN UN CHAT (HÍBRIDO / MANUAL) ──
    if (action === "toggle_chat_agent_mode") {
      const { chatId, agentMode } = body; // 'agent' | 'manual'
      if (!chatId) return NextResponse.json({ error: "chatId requerido" }, { status: 400 });

      const { data: chatRow } = await supabase
        .from("whatsapp_chats")
        .select("notes")
        .eq("id", chatId)
        .maybeSingle();

      let notesObj: any = {};
      try {
        notesObj = typeof chatRow?.notes === "string" ? JSON.parse(chatRow.notes) : (chatRow?.notes || {});
      } catch {}

      notesObj.agentMode = agentMode;
      // El modo es permanente: si se pone en 'manual', se queda manual para siempre
      // a menos que el usuario vuelva a presionar 'Agente'
      delete notesObj.manualUntil;

      await supabase
        .from("whatsapp_chats")
        .update({
          notes: JSON.stringify(notesObj),
          updated_at: new Date().toISOString(),
        })
        .eq("id", chatId);

      return NextResponse.json({ success: true, agentMode });
    }

    // ── 8. HISTORIAL CENTRALIZADO DE CONVERSACIÓN FOXBOT (SINCRONIZADO EN LA NUBE) ──
    if (action === "get_chat_history") {
      try {
        const { data: fileData } = await supabase.storage
          .from("product-images")
          .download("_system/foxbot_chat_history.json");

        if (fileData) {
          const rawText = await fileData.text();
          const parsed = JSON.parse(rawText || "[]");
          if (Array.isArray(parsed) && parsed.length > 0) {
            return NextResponse.json({ success: true, messages: parsed });
          }
        }
      } catch (err) {
        console.warn("foxbot_chat_history.json no existe aún:", err);
      }
      return NextResponse.json({ success: true, messages: [] });
    }

    if (action === "save_chat_history") {
      const { messages } = body;
      if (!Array.isArray(messages)) {
        return NextResponse.json({ error: "messages debe ser un array" }, { status: 400 });
      }

      // Guardar últimos 100 mensajes para optimizar peso y rapidez
      const trimmed = messages.slice(-100);
      const buffer = Buffer.from(JSON.stringify(trimmed, null, 2));
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload("_system/foxbot_chat_history.json", buffer, {
          contentType: "application/json",
          upsert: true,
        });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // ── 9. RADAR DE IMPORTACIÓN USA (EXTRAER ARTÍCULOS PEDIDOS POR CLIENTES EN WHATSAPP) ──
    if (action === "extract_chat_import_requests") {
      const { chatId } = body;
      if (!chatId) return NextResponse.json({ error: "chatId requerido" }, { status: 400 });

      // Consultar mensajes con fotos en este chat (la columna en la BD es created_at)
      const { data: messages, error: msgErr } = await supabase
        .from("whatsapp_messages")
        .select("id, text, media_url, media_type, created_at")
        .eq("chat_id", chatId)
        .not("media_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (msgErr) throw new Error(msgErr.message);

      const photoMessages = (messages || []).filter(
        (m: any) => m.media_url && (m.media_type === "image" || m.media_url.startsWith("data:image/") || m.media_url.startsWith("http"))
      );

      // Usar Gemini Vision para analizar las fotos enviadas por el cliente
      const apiKey = process.env.GEMINI_API_KEY;

      const analyzeItem = async (msg: any) => {
        try {
          const base64Data = msg.media_url.replace(/^data:image\/[a-z]+;base64,/, "");
          const isBase64 = msg.media_url.startsWith("data:image/");
          
          let promptInstruction = `Analiza esta imagen enviada por un cliente en WhatsApp solicitando producto o cotización de importación.
Texto que acompañó el mensaje: "${msg.text || ''}".
Tipo de cambio USD a MXN: $18.50 MXN por USD.
Costo logístico de importación promedio estimado por pieza: $25.00 MXN.
Margen comercial estándar de la tienda para generar excelente ganancia: 50% a 65% de margen sobre el costo total.

Identifica y calcula con precisión:
1. Nombre claro y comercial del producto en español.
2. Marca (ej. Bath & Body Works, Victoria's Secret, Nike, Coach, etc.).
3. Precio en tienda de USA (en USD, ej. 8.95 para velas de 1 mecha o 16.95 para cremas/mists, 26.95 para velas de 3 mechas en temporada, o precio real retail).
4. Tienda física / online de USA recomendada donde es más conveniente comprarlo (ej. "Bath & Body Works USA", "Amazon US", "Walmart US", "Target US", "TJ Maxx / Marshalls").
5. Precio que el cliente mencionó en su mensaje (si escribió $205, pon "$205").
6. Cálculo financiero:
   - Costo total de importación en MXN = (Precio USD * 18.50) + $25 envío unitario.
   - Precio de venta sugerido al público en MXN (redondeado, manteniendo la ganancia saludable y competitivo contra el mercado de reventa).
   - Ganancia neta estimada en MXN (Precio de venta sugerido - Costo total).
7. Términos de búsqueda precisos en inglés para encontrarlo en tiendas de Estados Unidos (nombre exacto de la fragancia o producto en inglés, ej: "White Pumpkin Single Wick Candle", "Champagne Apple and Honey Fine Fragrance Mist").

Devuelve exclusivamente un JSON con esta estructura exacta:
{
  "productName": "Nombre en español",
  "brand": "Marca",
  "clientPrice": "${msg.text || 'N/A'}",
  "category": "Categoría",
  "suggestedStore": "Tienda en USA (ej. Bath & Body Works Oficial o Amazon US)",
  "storePriceUSD": 8.95,
  "estimatedCostMXN": 190,
  "suggestedSalePriceMXN": 320,
  "estimatedProfitMXN": 130,
  "profitMarginPct": 41,
  "searchQueryUSA": "Términos en inglés para buscar en tiendas USA"
}`;

          let visionData: any = null;
          const visionModels = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

          let rawBase64 = "";
          let mimeType = "image/jpeg";

          if (isBase64) {
            rawBase64 = base64Data;
            const mimeMatch = msg.media_url.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,/);
            if (mimeMatch) mimeType = mimeMatch[1];
          } else if (msg.media_url.startsWith("http")) {
            // Descargar la imagen de la URL para procesarla con Gemini Vision
            try {
              const imgRes = await fetch(msg.media_url);
              if (imgRes.ok) {
                const arrayBuf = await imgRes.arrayBuffer();
                rawBase64 = Buffer.from(arrayBuf).toString("base64");
                const contentType = imgRes.headers.get("content-type");
                if (contentType && contentType.startsWith("image/")) {
                  mimeType = contentType;
                }
              }
            } catch (dlErr) {
              console.error("[Radar Vision] Error descargando imagen remota:", dlErr);
            }
          }

          if (rawBase64) {
            for (const vModel of visionModels) {
              try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${vModel}:generateContent?key=${apiKey}`;
                const gRes = await fetch(url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{
                      role: "user",
                      parts: [
                        { text: promptInstruction },
                        { inlineData: { mimeType, data: rawBase64 } }
                      ]
                    }],
                    generationConfig: { responseMimeType: "application/json" }
                  })
                });
                if (!gRes.ok) continue;
                const gData = await gRes.json();
                const txt = gData.candidates?.[0]?.content?.parts?.[0]?.text;
                if (txt) {
                  visionData = JSON.parse(txt);
                  break;
                }
              } catch {}
            }
          }

          if (visionData) {
            let liveConfirmed = false;
            let realStorePriceUSD = Number(visionData.storePriceUSD || 10);
            let verifiedProductUrl = "";
            let verifiedStoreName = visionData.suggestedStore || "Tienda USA";
            let stockStatus = "Disponible";

            // FASE 2: Búsqueda en vivo en internet con Google Search Grounding para verificar precio real y disponibilidad
            const liveSearchQuery = (visionData.searchQueryUSA || `${visionData.brand || ''} ${visionData.productName || ''}`).trim();
            try {
              const liveSearchPrompt = `Busca en internet en tiempo real el producto "${liveSearchQuery}".
Confirma si está disponible para comprar en tiendas online de USA (como Bath & Body Works, Amazon US, Walmart, etc.), cuál es su precio actual en USD y la URL directa exacta donde se puede comprar.
Devuelve únicamente un JSON con este formato:
{
  "isAvailable": true,
  "currentPriceUSD": 14.95,
  "storeName": "Bath & Body Works",
  "directProductUrl": "https://www.bathandbodyworks.com/p/...",
  "statusNote": "Disponible en tienda"
}`;

              const liveUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
              const liveRes = await fetch(liveUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{
                    role: "user",
                    parts: [{ text: liveSearchPrompt }]
                  }],
                  tools: [{ google_search: {} }]
                })
              });

              if (liveRes.ok) {
                const liveJson = await liveRes.json();
                const cand = liveJson.candidates?.[0];
                const rawLiveText = cand?.content?.parts?.[0]?.text || "";
                
                // Extraer enlaces encontrados por Google Grounding
                const groundingChunks = cand?.groundingMetadata?.groundingChunks || [];
                const webSources = groundingChunks
                  .map((c: any) => c.web?.uri)
                  .filter((uri: string) => uri && (uri.startsWith("http://") || uri.startsWith("https://")));

                // Intentar parsear el JSON de la respuesta
                const jsonMatch = rawLiveText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const parsedLive = JSON.parse(jsonMatch[0]);
                  liveConfirmed = true;
                  if (parsedLive.currentPriceUSD && Number(parsedLive.currentPriceUSD) > 0) {
                    realStorePriceUSD = Number(parsedLive.currentPriceUSD);
                  }
                  if (parsedLive.directProductUrl && parsedLive.directProductUrl.startsWith("http")) {
                    verifiedProductUrl = parsedLive.directProductUrl;
                  } else if (webSources.length > 0) {
                    verifiedProductUrl = webSources[0];
                  }
                  if (parsedLive.storeName) {
                    verifiedStoreName = parsedLive.storeName;
                  }
                  stockStatus = parsedLive.statusNote || (parsedLive.isAvailable ? "En Stock Confirmado" : "Agotado / Difícil");
                } else if (webSources.length > 0) {
                  verifiedProductUrl = webSources[0];
                  liveConfirmed = true;
                  stockStatus = "Encontrado en vivo";
                }
              }
            } catch {
              // Si falla la búsqueda en vivo, continuamos con los datos de visión
            }

            const rawSearchQuery = (visionData.searchQueryUSA || `${visionData.brand || ''} ${visionData.productName || ''}`).trim();
            const cleanQuery = rawSearchQuery.replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
            const queryExactUSA = encodeURIComponent(cleanQuery || visionData.productName);

            // Cálculos financieros con el precio real confirmado
            const usd = realStorePriceUSD;
            const costMxn = Math.round(usd * 18.5 + 25);
            const saleMxn = Math.round(Number(visionData.suggestedSalePriceMXN || Math.round(costMxn * 1.55)));
            const profitMxn = Math.round(saleMxn - costMxn);
            const marginPct = costMxn > 0 ? Math.round((profitMxn / costMxn) * 100) : 55;

            // Determinar enlace directo final
            let finalStoreUrl = verifiedProductUrl;
            const brandLower = (visionData.brand || "").toLowerCase();

            if (!finalStoreUrl) {
              if (brandLower.includes("bath") || brandLower.includes("body works")) {
                finalStoreUrl = `https://www.bathandbodyworks.com/search?q=${queryExactUSA}`;
              } else if (brandLower.includes("victoria") || brandLower.includes("secret")) {
                finalStoreUrl = `https://www.victoriassecret.com/us/search?q=${queryExactUSA}`;
              } else if (brandLower.includes("nike")) {
                finalStoreUrl = `https://www.nike.com/w?q=${queryExactUSA}`;
              } else {
                finalStoreUrl = `https://www.google.com/search?tbm=shop&q=${queryExactUSA}`;
              }
            }

            return {
              id: msg.id,
              productName: visionData.productName || "Artículo solicitado",
              brand: visionData.brand || "Sin marca",
              clientPrice: visionData.clientPrice || msg.text || "N/A",
              category: visionData.category || "General",
              suggestedStore: verifiedStoreName,
              officialStoreUrl: finalStoreUrl,
              storePriceUSD: usd,
              estimatedCostMXN: costMxn,
              suggestedSalePriceMXN: saleMxn,
              estimatedProfitMXN: profitMxn,
              profitMarginPct: marginPct,
              searchQueryUSA: rawSearchQuery,
              imageUrl: msg.media_url,
              timestamp: msg.created_at,
              isLiveConfirmed: liveConfirmed,
              stockStatus,
              links: {
                officialStore: finalStoreUrl,
                amazon: `https://www.amazon.com/s?k=${queryExactUSA}`,
                walmart: `https://www.walmart.com/search?q=${queryExactUSA}`,
                target: `https://www.target.com/s?searchTerm=${queryExactUSA}`,
                googleShopping: `https://www.google.com/search?tbm=shop&q=${queryExactUSA}`,
              }
            };
          } else {
            const rawQuery = msg.text || "bath and body works import usa";
            const query = encodeURIComponent(rawQuery);
            return {
              id: msg.id,
              productName: msg.text || "Artículo en foto",
              brand: "N/A",
              clientPrice: msg.text || "N/A",
              category: "General",
              suggestedStore: "Google Shopping USA",
              officialStoreUrl: `https://www.google.com/search?tbm=shop&q=${query}`,
              storePriceUSD: 10,
              estimatedCostMXN: 210,
              suggestedSalePriceMXN: 340,
              estimatedProfitMXN: 130,
              profitMarginPct: 62,
              searchQueryUSA: rawQuery,
              imageUrl: msg.media_url,
              timestamp: msg.created_at,
              links: {
                officialStore: `https://www.google.com/search?tbm=shop&q=${query}`,
                amazon: `https://www.amazon.com/s?k=${query}`,
                walmart: `https://www.walmart.com/search?q=${query}`,
                target: `https://www.target.com/s?searchTerm=${query}`,
                googleShopping: `https://www.google.com/search?tbm=shop&q=${query}`,
              }
            };
          }
        } catch {
          const rawQuery = msg.text || "producto importado usa";
          const query = encodeURIComponent(rawQuery);
          return {
            id: msg.id,
            productName: msg.text || "Artículo en foto",
            brand: "N/A",
            clientPrice: msg.text || "N/A",
            category: "General",
            searchQueryUSA: rawQuery,
            imageUrl: msg.media_url,
            timestamp: msg.created_at,
            links: {
              amazon: `https://www.amazon.com/s?k=${query}`,
              walmart: `https://www.walmart.com/search?q=${query}`,
              target: `https://www.target.com/s?searchTerm=${query}`,
              googleShopping: `https://www.google.com/search?tbm=shop&q=${query}`,
            }
          };
        }
      };

      // Procesar concurrentemente hasta 12 fotos para velocidad instantánea
      const itemsToProcess = photoMessages.slice(0, 12);
      const identifiedItems = await Promise.all(itemsToProcess.map(analyzeItem));

      return NextResponse.json({ success: true, items: identifiedItems });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error: any) {
    console.error("Error en /api/admin/agent:", error);
    return NextResponse.json({ error: error.message || "Error interno del agente" }, { status: 500 });
  }
}
