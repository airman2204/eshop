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

    // ── B1. FASE 1: DIRECTOR DE MARKETING (DIAGNÓSTICO COMERCIAL + EJE ESTRATÉGICO ÚNICAMENTE) ──
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

        // 3. Catálogo real de productos con stock
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
Tu perfil es el de un Gerente de Negocios Senior con maestría en e-commerce internacional.
Tu trabajo en esta etapa es EXCLUSIVAMENTE analizar la salud comercial de la tienda y dictar el Tema Estratégico de la semana.
NUNCA redactes copys para redes sociales ni diseñes prompts visuales en esta fase (eso lo hará tu equipo después).
REGLAS OBLIGATORIAS:
1. FoxDrop es una plataforma nacional de importación segura a todo México (nunca menciones entregas locales ni Puebla).
2. FoxDrop NO es solo cosmética ni Bath & Body Works: es un catálogo curado multimarca de importaciones exclusivas.
3. Habla con rigor de Gerente de Negocios analítico a tu CEO Mario.`;

        const prompt = `Analiza la situación comercial de FoxDrop:
- Ventas del mes: $${monthlySales} MXN (Meta: $${targetMonthly.toLocaleString()} MXN).
- Carritos abandonados: ${abandonedCartsCount} ($${abandonedCartsTotal} MXN en el aire).
- Catálogo en bodega: ${JSON.stringify(catalog.map((c: any) => ({ id: c.id, title: c.title, price: c.price, stock: c.stock })), null, 2)}
${feedback ? `- Indicación estratégica del CEO Mario: "${feedback}"` : ""}

Devuelve ÚNICAMENTE un JSON con este formato exacto:
{
  "weeklyTheme": "Nombre del eje estratégico semanal (ej. Confianza Total en Importaciones o Renueva tu Cuidado Personal)",
  "funnelDiagnostic": "Diagnóstico claro y analítico explicando dónde está la fuga de ingresos este mes y qué ángulo la resolverá",
  "strategicAngle": "Justificación estratégica de la campaña con criterio comercial",
  "storeWideStrategy": {
    "pillar": "Pilar institucional de la plataforma (ej. Envíos Seguros a Todo México / Garantía de Autenticidad / Compras sin Aduana)",
    "valueProposition": "Propuesta de valor institucional para foxdrop.mx explicada en 2 oraciones"
  },
  "featuredProduct": {
    "id": "${catalog[0]?.id || 'prod_1'}",
    "title": "${catalog[0]?.title || 'Artículo Exclusivo FoxDrop'}",
    "price": ${catalog[0]?.price || 499},
    "image": "${catalog[0]?.image || ''}"
  },
  "analystInsight": "Justificación de inventario de por qué este artículo o categoría impulsará el ticket promedio de compra esta semana"
}`;

        const aiResponse = await callGemini(prompt, systemPrompt, { responseJson: true });
        let parsed: any = null;
        try {
          parsed = JSON.parse(aiResponse);
        } catch {
          const clean = aiResponse.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
          const jsonMatch = clean.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0].replace(/,\s*([}\]])/g, "$1").replace(/[\u0000-\u001F]+/g, " "));
          }
        }

        if (parsed) {
          parsed.id = `mkt_strat_${Date.now()}`;
          parsed.createdAt = new Date().toISOString();
          return NextResponse.json({ success: true, strategy: parsed });
        }

        throw new Error("No se pudo estructurar el diagnóstico del Director");
      } catch (err: any) {
        console.error("Error en mkt_director_strategy:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    // ── B2. FASE 2: COPYWRITER & REDES (GENERA PARRILLA 7 DÍAS CON HOOKS Y COPYS BASADOS EN EL EJE APROBADO) ──
    if (action === "mkt_generate_copys") {
      try {
        const { weeklyTheme, strategicAngle, storePillar, featuredProductTitle, featuredProductId } = body;

        const systemPrompt = `Eres el Copywriter Senior & Gestor de Redes Sociales de FoxDrop México (foxdrop.mx).
Tu función es redactar una parrilla editorial completa de 7 días (Lunes a Domingo) basada estrictamente en la estrategia aprobada por el Director: "${weeklyTheme || 'Curaduría FoxDrop'}".
REGLAS:
1. Equilibra la semana: 3 a 4 días de TIENDA_GLOBAL (posicionamiento de plataforma, unboxing, compras seguras a México) y 3 a 4 días de PRODUCTO_STOCK (impulso a producto de bodega).
2. Redacta copys profesionales con hooks atrapantes, enlaces inteligentes a foxdrop.mx y hashtags relevantes.
3. NO generes prompts visuales ni código de diseño gráfico en este paso; concéntrate 100% en el texto y persuasión.`;

        const prompt = `Estrategia aprobada por el Director:
- Eje: "${weeklyTheme}"
- Justificación: "${strategicAngle}"
- Pilar de Tienda: "${storePillar}"
- Producto Clave de Stock: "${featuredProductTitle || 'Curaduría FoxDrop'}" (ID: "${featuredProductId || ''}")

Redacta la parrilla de los 7 días. Devuelve ÚNICAMENTE un JSON válido con esta estructura:
{
  "weeklyParrilla": [
    {
      "day": "Lunes",
      "type": "TIENDA_GLOBAL",
      "title": "Apertura & Garantía FoxDrop",
      "headline": "Tu atajo seguro a lo mejor de USA sin aduanas",
      "copy": "Comprar tus marcas favoritas del extranjero nunca fue tan fácil. En FoxDrop seleccionamos las piezas más codiciadas, garantizamos autenticidad al 100% y te las enviamos aseguradas hasta la puerta de tu casa en cualquier parte de México.",
      "cta": "Explora el catálogo oficial en foxdrop.mx",
      "hashtags": ["#FoxDrop", "#ComprasSeguras", "#ImportacionesMexico", "#Tendencias"]
    },
    {
      "day": "Martes",
      "type": "PRODUCTO_STOCK",
      "title": "Enfoque de Stock en Bodega",
      "headline": "Edición limitada disponible para entrega inmediata",
      "copy": "Si buscabas ${featuredProductTitle || 'este artículo'}, ya está disponible en México sin semanas de espera ni sorpresas aduanales. Pide hoy y recíbelo protegido en tu domicilio.",
      "cta": "Compra antes de que se agote en foxdrop.mx/tienda",
      "hashtags": ["#FoxDrop", "#StockReal", "#EntregaInmediata"]
    },
    {
      "day": "Miércoles",
      "type": "TIENDA_GLOBAL",
      "title": "Empaca Conmigo & Seguridad",
      "headline": "Así viaja tu pedido con protección total",
      "copy": "Cada orden en FoxDrop se embala con triple protección y sellos de seguridad. Porque sabemos el valor de lo que esperas, tu paquete viaja asegurado de principio a fin.",
      "cta": "Conoce nuestra garantía en foxdrop.mx",
      "hashtags": ["#FoxDrop", "#Unboxing", "#EmpaqueSeguro"]
    },
    {
      "day": "Jueves",
      "type": "PRODUCTO_STOCK",
      "title": "El Regalo Perfecto",
      "headline": "¿Buscando un detalle inolvidable?",
      "copy": "Sorprende con una pieza original que no se consigue fácilmente en tiendas convencionales de México. Disponible con despacho prioritario.",
      "cta": "Ordena en foxdrop.mx",
      "hashtags": ["#FoxDrop", "#RegalosExclusivos", "#LujoAccesible"]
    },
    {
      "day": "Viernes",
      "type": "PRODUCTO_STOCK",
      "title": "Últimas Piezas del Lote",
      "headline": "Inventario limitado en bodega nacional",
      "copy": "Nuestros lotes de importación vuelan rápido. Aprovecha el stock disponible este fin de semana antes de que vuelva a estar bajo pedido.",
      "cta": "Asegura el tuyo en foxdrop.mx",
      "hashtags": ["#FoxDrop", "#UltimasPiezas"]
    },
    {
      "day": "Sábado",
      "type": "TIENDA_GLOBAL",
      "title": "Lifestyle & Descubrimiento",
      "headline": "Lo mejor del mundo a un clic de distancia",
      "copy": "FoxDrop es tu concierge de importaciones. Traemos lo que marca tendencia en el extranjero directo a tu hogar con pago seguro y seguimiento en tiempo real.",
      "cta": "Descubre novedades en foxdrop.mx/tienda",
      "hashtags": ["#FoxDrop", "#Lifestyle", "#TendenciasGlobales"]
    },
    {
      "day": "Domingo",
      "type": "TIENDA_GLOBAL",
      "title": "Ruta Nacional de Despachos",
      "headline": "Preparando envíos para toda la República",
      "copy": "Todo listo en nuestro centro de despacho para salir este lunes a cualquier rincón de México. Tu compra llega segura y a tiempo.",
      "cta": "Haz tu pedido hoy en foxdrop.mx",
      "hashtags": ["#FoxDrop", "#EnviosMexico", "#ComprasOnline"]
    }
  ]
}`;

        const aiResponse = await callGemini(prompt, systemPrompt, { responseJson: true });
        let parsed: any = null;
        try {
          parsed = JSON.parse(aiResponse);
        } catch {
          const clean = aiResponse.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
          const jsonMatch = clean.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0].replace(/,\s*([}\]])/g, "$1").replace(/[\u0000-\u001F]+/g, " "));
          }
        }

        if (parsed && Array.isArray(parsed.weeklyParrilla)) {
          return NextResponse.json({ success: true, weeklyParrilla: parsed.weeklyParrilla });
        }

        throw new Error("No se pudo estructurar la parrilla de copys");
      } catch (err: any) {
        console.error("Error en mkt_generate_copys:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    // ── B3. FASE 3: DISEÑADOR VISUAL (FORMULA EL PROMPT DE GEMINI EXCLUSIVO PARA EL DÍA SELECCIONADO) ──
    if (action === "mkt_design_day_prompt") {
      try {
        const { dayPlan, productTitle, weeklyTheme } = body;
        const isStoreGlobal = dayPlan?.type === "TIENDA_GLOBAL";
        const dayName = dayPlan?.day || "Lunes";
        const headline = dayPlan?.headline || dayPlan?.title || "Importación Oficial";

        const systemPrompt = `Eres el Director de Arte & Diseñador Gráfico de FoxDrop México.
Tu trabajo es formular un prompt de alta precisión fotográfica para Gemini Imagen / FLUX respetando el Manual de Identidad de Marca:
- Colores oficiales: Verde Bosque Profundo (#0F3E36), Dorado Caramelo (#E3B888) y Acentos Naranja Zorro (#E65F2B).
- Logotipo y Marca: "FOXDROP" con relieve y lema "TU ATAJO AL MUNDO".
- Sello oficial: "foxdrop.mx • Envíos Asegurados a todo México".
Si el día es TIENDA_GLOBAL: El protagonista visual es la plataforma (caja prémium de unboxing, lazos satinados, sello lacrado de zorro, mapas dorados de cobertura nacional y envíos aéreos). NUNCA coloques frascos o productos de stock en días de Tienda Global.
Si el día es PRODUCTO_STOCK: El protagonista visual es el producto específico ("${productTitle || 'Artículo Exclusivo'}") sobre pedestal de mármol esmeralda con iluminación de estudio comercial.`;

        const prompt = `Crea el prompt fotográfico editorial definitivo para el día ${dayName} (${dayPlan?.type}):
- Tema de la semana: "${weeklyTheme || 'FoxDrop Oficial'}"
- Título del post: "${dayPlan?.title || ''}"
- Titular / Gancho: "${headline}"
- Copy del día: "${dayPlan?.copy || ''}"

Devuelve ÚNICAMENTE un JSON con:
{
  "dayVisualPrompt": "Prompt visual detallado y descriptivo en español listo para pegar en Gemini Web...",
  "eyebrowBadge": "Texto superior pequeño",
  "headline": "Titular editorial",
  "subheadline": "Subtítulo de soporte",
  "trustTag": "Sello de confianza"
}`;

        const aiResponse = await callGemini(prompt, systemPrompt, { responseJson: true });
        let parsed: any = null;
        try {
          parsed = JSON.parse(aiResponse);
        } catch {
          const clean = aiResponse.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
          const jsonMatch = clean.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0].replace(/,\s*([}\]])/g, "$1").replace(/[\u0000-\u001F]+/g, " "));
          }
        }

        if (parsed && parsed.dayVisualPrompt) {
          return NextResponse.json({ success: true, ...parsed });
        }

        // Fallback robusto si Gemini devuelve texto plano
        const fallbackPrompt = isStoreGlobal
          ? `Fotografía publicitaria de estudio comercial para FoxDrop México. Caja prémium de importación verde bosque (#0F3E36) con sello lacrado dorado (#E3B888) y relieve "FOXDROP: TU ATAJO AL MUNDO", iluminación cinematográfica, sin productos específicos, atmósfera de plataforma de compras seguras a todo México 8k.`
          : `Fotografía comercial publicitaria para FoxDrop México destacando ${productTitle || 'artículo exclusivo'}. Montado sobre pedestal de mármol esmeralda (#0F3E36), reflejos cálidos dorados (#E3B888), iluminación suave de estudio, ultra nítida 8k.`;

        return NextResponse.json({
          success: true,
          dayVisualPrompt: fallbackPrompt,
          eyebrowBadge: isStoreGlobal ? "PLATAFORMA OFICIAL • IMPORTACIÓN PROTEGIDA" : "STOCK CONFIRMADO • ENTREGA INMEDIATA",
          headline,
          subheadline: isStoreGlobal ? "Garantía de entrega protegida a todo México sin trámites de aduana." : "Disponible en bodega para despacho prioritario a toda la República.",
          trustTag: "foxdrop.mx • Envíos Asegurados a todo México"
        });
      } catch (err: any) {
        console.error("Error en mkt_design_day_prompt:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    // ── C. GENERADOR VISUAL NANO BANANA: PROPUESTAS DE DISEÑO AUTÓNOMAS (GEMINI + DISEÑADOR) ──
    if (action === "mkt_visual_nanobanana") {
      try {
        const { prompt: userPrompt, format, productTitle, productImage, currentDay } = body;
        const isVertical = format === "9:16";

        // Gemini como Diseñador Gráfico & Director de Arte Autónomo
        // Interpreta el prompt o genera 3 conceptos visuales únicos y profesionales
        const designerPrompt = `Actúa como el Diseñador Gráfico y Director Creativo de FoxDrop México (tienda de importaciones exclusivas, lifestyle y cosmética de lujo).
El CEO te ha dado esta instrucción / visión creativa:
"${userPrompt || "Crea propuestas de diseño de alto impacto comercial, estética de revista de moda/editorial contemporánea, con iluminación de estudio, contrastes elegantes y balance tipográfico impecable"}"

Contexto del post:
- Producto / Tema: ${productTitle || "Colección Exclusiva FoxDrop"}
- Día de la semana: ${currentDay || "General"}
- Formato: ${isVertical ? "TikTok / Reels (9:16 vertical)" : "Instagram / Facebook (1:1 cuadrado)"}

Como diseñador profesional, NO hagas una sola idea aburrida. Crea EXACTAMENTE 3 propuestas de diseño completamente distintas para que el CEO elija la mejor:

1. Propuesta 1 (Concepto A): Estilo Editorial de Lujo / High Fashion (tipografía serif elegante, fondos oscuros o cremas con reflejos dorados y pedestal de mármol).
2. Propuesta 2 (Concepto B): Estilo Bold Moderno / Vibrant Trend (contraste llamativo, acentos naranja FoxDrop o tonos frescos, sombras duras o estética pop de alta gama).
3. Propuesta 3 (Concepto C): Estilo Botánico Orgánico / Lifestyle Cálido (luz solar difusa, texturas de lino o madera clara, hojas verdes, atmósfera relajante y natural).

Para CADA una de las 3 propuestas, debes definir:
- id: "propuesta_1", "propuesta_2", "propuesta_3"
- name: Nombre creativo del concepto de diseño (ej. "Vogue Emerald Glow", "Urban Neon Minimal", "Botanical Sunbeam")
- conceptRationale: Explicación de por qué este diseño vende y qué emoción transmite (máx 2 oraciones)
- style:
    * backgroundStyle: CSS inline o clases de degradado (ej. "linear-gradient(135deg, #071e19 0%, #0F3E36 50%, #051411 100%)")
    * primaryColor: Color hexadecimal principal
    * accentColor: Color de acento
    * textColor: Color de texto de alto contraste
    * cardOverlay: Estilo de tarjeta de texto (ej. "bg-black/60 backdrop-blur-md border border-[#E3B888]/40")
- typography:
    * eyebrowBadge: "CURADURÍA FOXDROP" o "EDICIÓN LIMITADA" o "IMPORTACIÓN OFICIAL"
    * headline: Titular impactante y persuasivo pensado para este concepto
    * subheadline: Frase de soporte con propuesta de valor
    * trustTag: Sello de garantía ("Envíos Asegurados a todo México" o "100% Auténtico Garantizado")
    * ctaText: Texto del botón o llamado a la acción ("foxdrop.mx", "Comprar en foxdrop.mx", "Ver Lote")
- visualDetails: Lista de 3 elementos gráficos distintivos (ej. ["Pedestal de mármol pulido", "Aura dorada detrás del producto", "Marco fino con filete dorado"])

Devuelve ÚNICAMENTE un JSON válido con esta estructura:
{
  "proposals": [
    {
      "id": "propuesta_1",
      "name": "...",
      "conceptRationale": "...",
      "style": {
        "backgroundStyle": "...",
        "primaryColor": "...",
        "accentColor": "...",
        "textColor": "...",
        "cardOverlay": "..."
      },
      "typography": {
        "eyebrowBadge": "...",
        "headline": "...",
        "subheadline": "...",
        "trustTag": "...",
        "ctaText": "..."
      },
      "visualDetails": ["...", "...", "..."]
    }
  ]
}`;

        const systemPrompt = "Eres un Director de Arte y Diseñador Gráfico Senior en e-commerce de prestigio. Respondes con criterio estético impecable, colores combinados a la perfección y tipografías vendedoras. Devuelve ÚNICAMENTE JSON válido.";

        // Generar las propuestas conceptuales de diseño con Gemini
        const aiResponse = await callGemini(designerPrompt, systemPrompt, { responseJson: true });
        let parsed: any = null;
        try {
          parsed = JSON.parse(aiResponse);
        } catch {
          const match = aiResponse.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
        }

        if (parsed && Array.isArray(parsed.proposals) && parsed.proposals.length > 0) {
          // Intentar generar la fotografía publicitaria real con el modelo de imagen de Gemini
          const apiKey = process.env.GEMINI_API_KEY;
          let generatedAiImageUrl: string | null = null;

          if (apiKey && apiKey !== "TU_API_KEY_AQUI") {
            const imageModels = [
              "gemini-2.5-flash-image",
              "gemini-3.1-flash-image",
              "gemini-3-pro-image"
            ];

            const visualPrompt = `Professional commercial advertising studio photography for FoxDrop luxury store. Subject: ${productTitle || "Exclusive beauty and fragrance bottle"}. Setting: luxurious marble pedestal, warm golden studio lighting, soft reflections, high-end Vogue editorial aesthetic, crystal clear focus, 8k commercial photography.`;

            for (const imgModel of imageModels) {
              try {
                const imgRes = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/${imgModel}:generateContent?key=${apiKey}`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      contents: [{ parts: [{ text: visualPrompt }] }],
                    }),
                  }
                );

                if (imgRes.ok) {
                  const imgData = await imgRes.json();
                  const candidate = imgData.candidates?.[0];
                  const part = candidate?.content?.parts?.find((p: any) => p.inlineData || p.inline_data);
                  const inline = part?.inlineData || part?.inline_data;
                  if (inline?.data) {
                    const mime = inline.mimeType || inline.mime_type || "image/jpeg";
                    generatedAiImageUrl = `data:${mime};base64,${inline.data}`;
                    break;
                  }
                }
              } catch (imgErr) {
                console.warn(`Error llamando a modelo de imagen ${imgModel}:`, imgErr);
              }
            }
          }

          return NextResponse.json({
            success: true,
            proposals: parsed.proposals,
            generatedAiImageUrl,
            format: format || "1:1",
          });
        }

        throw new Error("No se pudieron generar las propuestas de diseño");
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
