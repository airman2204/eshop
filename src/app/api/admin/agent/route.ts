/**
 * ============================================================================
 * FOXDROP — ENDPOINT DEL AGENTE INTELIGENTE (/api/admin/agent)
 * ============================================================================
 * Procesa peticiones de asistencia de ventas, generación de publicaciones
 * para redes sociales, seguimiento a pedidos y chat estratégico con Gemini.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

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

async function callGemini(prompt: string, systemInstruction?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "TU_API_KEY_AQUI") {
    throw new Error("GEMINI_API_KEY no está configurada en .env.local");
  }

  // Modelos ordenados por prioridad y compatibilidad garantizada
  const models = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.8-flash"];
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

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
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
    const body = await req.json();
    const { action } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    // ── 1. GENERACIÓN DE PUBLICACIÓN PARA REDES SOCIALES ──
    if (action === "generate_social_post") {
      const { productTitle, productCategory, price, discountPercent, platform, tone, audience } = body;

      const systemPrompt = `Eres FoxBot, el estratega experto de marketing digital y redes sociales de FoxDrop Puebla (tienda de importación exclusiva, gadgets, cosmética, papelería y coleccionables en Puebla, México).
Tu misión es redactar publicaciones persuasivas, atractivas y optimizadas para ventas que hagan que la gente quiera comprar de inmediato.
Usa emojis acordes, ganchos de atención (hooks) contundentes, llamadas a la acción claras (CTA) invitando a escribir por WhatsApp o visitar foxdrop.mx, y hashtags populares en México y Puebla (#Puebla #FoxDrop #OfertasPuebla).`;

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

      const systemPrompt = `Eres FoxBot, el Director Creativo y Estratega de Crecimiento de FoxDrop Puebla (tienda de importación exclusiva, gadgets, cosméticos, coleccionables y tecnología en Puebla, México).
Tu objetivo primordial es LOGRAR QUE LA TIENDA SEA CONOCIDA Y RECONOCIDA en toda la ciudad de Puebla y alrededores mediante presencia continua, atractiva y profesional.

Debes armar una parrilla estratégica de publicaciones para los 7 días de la semana (Lunes a Domingo) balanceando los 4 pilares:
1. Lunes - Novedad / Lo Más Nuevo de Importación (despertar deseo por lo recién llegado).
2. Martes - Educativo / Curiosidad (para qué sirve, problema que soluciona o demostración).
3. Miércoles - Producto Estrella / Best Seller (el más viral o buscado).
4. Jueves - Pregunta a la Comunidad / Interacción de Puebla (engagement, votaciones, curiosidades).
5. Viernes - Oferta Relámpago de Fin de Semana (urgencia, compra inmediata antes de agotar stock).
6. Sábado - Combo o Regalo Ideal (fomento de ticket promedio alto).
7. Domingo - Confianza Local & Entregas en Puebla (recordar entregas personales en Plaza Dorada, Angelópolis, Zócalo, CAPU, envíos seguros y Club de Estrellas FoxDrop).

IMPORTANTE:
- Usa ganchos de atención virales (hooks) que detengan el scroll.
- Emojis pertinentes y llamados a la acción claros invitando a escribir al WhatsApp o visitar foxdrop.mx.
- Hashtags estratégicos locales de Puebla (#Puebla #PueblaDeZaragoza #FoxDrop #Cholula #AngelopolisPuebla #TiendaPuebla #ImportacionesPuebla).`;

      const prompt = `Genera un plan semanal estructurado para FoxDrop.
Tema o enfoque de la semana: ${focusTheme || "Crecimiento de marca, tendencias de importación y promociones en Puebla"}

Catálogo de productos disponibles para elegir:
${JSON.stringify(productsSummary, null, 2)}

Devuelve ÚNICAMENTE un JSON válido con la siguiente estructura exacta:
{
  "theme": "Título inspirador de la campaña de la semana",
  "weekLabel": "Semana del Crecimiento FoxDrop Puebla",
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
      "hashtags": ["#FoxDrop", "#Puebla", "#NovedadesPuebla"]
    }
  ]
} (Asegúrate de incluir exactamente los 7 días de Lunes a Domingo)`;

      try {
        const aiResponse = await callGemini(prompt, systemPrompt);
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          // Asignar IDs y fullCopy
          parsed.id = `plan_${Date.now()}`;
          parsed.createdAt = new Date().toISOString();
          parsed.days = (parsed.days || []).map((d: any, idx: number) => ({
            ...d,
            id: `day_${idx}_${Date.now()}`,
            fullCopy: `${d.headline}\n\n${d.caption}\n\n👉 ${d.callToAction}\n\n${(d.hashtags || []).join(" ")}`,
            isCompleted: false,
          }));
          return NextResponse.json({ success: true, plan: parsed });
        }
        return NextResponse.json({ error: "No se pudo interpretar el formato del plan" }, { status: 500 });
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

    // ── 4. CHAT ASISTENTE ESTRATÉGICO CON DATOS EN VIVO ──
    if (action === "chat") {
      const { userMessage, history } = body;

      if (!userMessage) {
        return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
      }

      // Obtenemos métricas rápidas de la base de datos para darle súper poderes al agente
      const [
        { count: totalProducts },
        { data: pendingOrders },
        { data: lowStockProducts },
        { count: totalClients },
      ] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, status, total, client_name, created_at").eq("status", "pending").limit(5),
        supabase.from("products").select("title, stock, days_in_stock").lte("stock", 2).limit(5),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      const storeContext = `
DATOS ACTUALES DE FOXDROP EN TIEMPO REAL:
- Total de productos en catálogo: ${totalProducts || 0}
- Pedidos pendientes de procesar: ${(pendingOrders || []).length}
- Clientes registrados: ${totalClients || 0}
- Productos con poco stock (<= 2 unidades): ${(lowStockProducts || []).map((p: any) => `${p.title} (${p.stock} uds, ${p.days_in_stock} días en almacén)`).join(", ") || "Ninguno"}
- Pedidos pendientes recientes: ${(pendingOrders || []).map((o: any) => `${o.id} - ${o.client_name} ($${o.total})`).join(", ") || "Ninguno"}
`;

      const systemPrompt = `Eres "FoxBot AI", el copiloto ejecutivo, comercial y estratega de FoxDrop Puebla.
Ayudas al administrador de la tienda con:
1. Ideas para promocionar productos estancados o con alto margen.
2. Sugerencias de campañas para redes sociales (Instagram, TikTok, Facebook).
3. Recomendaciones operativas sobre pedidos pendientes y servicio al cliente.
4. Estrategias de precios, combos o liquidaciones.

Tono: Proactivo, analítico, directo, optimista y con mentalidad de crecimiento para el e-commerce.
Usa formato markdown limpio (negritas, listas con viñetas) y emojis acordes.
Contexto de la tienda:
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
        const reply = await callGemini(conversationPrompt, systemPrompt);
        return NextResponse.json({ success: true, reply });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error: any) {
    console.error("Error en /api/admin/agent:", error);
    return NextResponse.json({ error: error.message || "Error interno del agente" }, { status: 500 });
  }
}
