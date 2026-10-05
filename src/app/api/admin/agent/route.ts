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
            pillar: idx === 0 ? "novedad" : idx === 4 ? "oferta" : idx === 6 ? "confianza_local" : "educativo",
            pillarLabel: idx === 0 ? "🔥 Novedad de Importación" : idx === 4 ? "⚡ Oferta Fin de Semana" : idx === 6 ? "📍 Entregas en Puebla" : "✨ Producto Destacado",
            productId: sampleProd.id,
            productTitle: sampleProd.title,
            productPrice: sampleProd.publicPrice || sampleProd.price || 199,
            productImage: sampleProd.image || sampleProd.images?.[0] || "",
            suggestedTime: idx % 2 === 0 ? "11:30 AM" : "07:30 PM",
            suggestedNetwork: idx === 4 ? "WhatsApp Estados & Grupos" : "Instagram & Facebook",
            headline: `¡Lo que estabas buscando en Puebla! Descubre ${sampleProd.title}`,
            caption: `¿Ya conocías este artículo? En FoxDrop traemos lo mejor de importación directo a Puebla.\n\n📦 Entregas personales en Plaza Dorada, Angelópolis y Zócalo.\n⭐ Acumula puntos y canjea descuentos con el Club FoxDrop.`,
            callToAction: "¡Mándanos mensaje directo por WhatsApp o entra a foxdrop.mx para apartar el tuyo antes de que se agote!",
            hashtags: ["#FoxDrop", "#Puebla", "#PueblaDeZaragoza", "#OfertasPuebla", "#AngelopolisPuebla"],
            fullCopy: `¡Lo que estabas buscando en Puebla! Descubre ${sampleProd.title}\n\n¿Ya conocías este artículo? En FoxDrop traemos lo mejor de importación directo a Puebla.\n\n📦 Entregas personales en Plaza Dorada, Angelópolis y Zócalo.\n⭐ Acumula puntos y canjea descuentos con el Club FoxDrop.\n\n👉 ¡Mándanos mensaje directo por WhatsApp o entra a foxdrop.mx para apartar el tuyo!\n\n#FoxDrop #Puebla #PueblaDeZaragoza #OfertasPuebla`,
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

    // ── 4. CHAT ASISTENTE ESTRATÉGICO CON DATOS EN VIVO ──
    if (action === "chat") {
      const { userMessage, history } = body;

      if (!userMessage) {
        return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
      }

      // Obtenemos contexto 360° en tiempo real del negocio para convertirlo en un verdadero JARVIS
      const [
        { count: totalProducts },
        { data: pendingOrders },
        { data: lowStockProducts },
        { data: agedProducts },
        { data: highMarginProducts },
        { count: totalClients },
        { data: recentOrders },
        { data: loyaltyRows },
      ] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, status, total, client_name, client_phone, created_at").eq("status", "pending").limit(8),
        supabase.from("products").select("title, stock, days_in_stock, public_price").lte("stock", 2).limit(6),
        supabase.from("products").select("title, stock, days_in_stock, public_price, profit_unit").gt("days_in_stock", 30).order("days_in_stock", { ascending: false }).limit(6),
        supabase.from("products").select("title, public_price, profit_unit, total_cost_mxn").order("profit_unit", { ascending: false }).limit(6),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total, status").neq("status", "cancelled").limit(50),
        supabase.from("profiles").select("loyalty_points").gt("loyalty_points", 0).limit(20),
      ]);

      const totalRevenueCalculated = (recentOrders || []).reduce((acc: number, o: any) => acc + (Number(o.total) || 0), 0);
      const totalPointsCirculating = (loyaltyRows || []).reduce((acc: number, p: any) => acc + (Number(p.loyalty_points) || 0), 0);

      const storeContext = `
=== AUDITORÍA OPERATIVA & FINANCIERA EN TIEMPO REAL (FOXDROP PUEBLA) ===
- Catálogo total: ${totalProducts || 0} productos activos.
- Ventas registradas recientes: $${totalRevenueCalculated.toFixed(2)} MXN (${(recentOrders || []).length} compras analizadas).
- Pedidos pendientes de entrega o confirmación: ${(pendingOrders || []).length}
  ${(pendingOrders || []).map((o: any) => `  * Folio ${o.id}: ${o.client_name} ($${o.total} MXN) - Tel: ${o.client_phone || 'N/A'}`).join("\n") || "  (Ninguno)"}
- Base de clientes: ${totalClients || 0} registrados. Puntos de lealtad en circulación: ${totalPointsCirculating} ⭐.
- Logística local oficial en Puebla: Puntos de entrega personales en Plaza Dorada, Angelópolis, Zona Zócalo y Central CAPU. Envíos nacionales con cobertura nacional.
- Productos con mayor margen de ganancia unitaria:
  ${(highMarginProducts || []).map((p: any) => `  * ${p.title}: Precio $${p.public_price} MXN (Utilidad neta: +$${p.profit_unit || 0} MXN)`).join("\n") || "  (N/A)"}
- Productos estancados en almacén (>30 días):
  ${(agedProducts || []).map((p: any) => `  * ${p.title}: ${p.days_in_stock} días en bodega, ${p.stock} uds disponibles (Precio: $${p.public_price} MXN)`).join("\n") || "  (Inventario fresco sin estancamiento)"}
- Productos con stock crítico (<= 2 unidades):
  ${(lowStockProducts || []).map((p: any) => `  * ${p.title} (${p.stock} uds restantes)`).join("\n") || "  (Stock saludable)"}
`;

      const systemPrompt = `Eres "JARVIS FoxDrop", la Inteligencia Artificial ejecutiva, estratega de negocios y copiloto comercial de FoxDrop Puebla.
No eres un bot común de respuestas genéricas. Eres el Director de Operaciones y Crecimiento (Chief Growth Officer) de la tienda. Conoces a fondo las cifras, los costos, las ganancias, el inventario y las entregas en Puebla.

PERSONALIDAD & PROTOCOLO JARVIS:
1. Trato: Educado, perspicaz, sumamente analítico, seguro de ti mismo, ágil y enfocado 100% en maximizar las ganancias y posicionar la marca FoxDrop en Puebla.
2. Formato: Respuestas claras, directas al grano, estructuradas con viñetas elegantes cuando convenga, sin rodeos innecesarios.
3. Habilidades que tienes a tu disposición:
   - Diagnóstico financiero: Sabes qué productos dejan más ganancia para priorizarlos.
   - Liquidación inteligente: Propones combos o promociones para artículos con muchos días en almacén.
   - Seguimiento a pedidos: Identificas pedidos pendientes y redactas el mensaje ideal para el cliente por WhatsApp.
   - Posicionamiento de marca: Propones campañas y ganchos de venta para Facebook, Instagram, TikTok y estados de WhatsApp.
4. Voz y Escucha: Estás preparado para responder comandos hablados por voz. Si la respuesta es leída en voz alta, sé conciso y elocuente.

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
