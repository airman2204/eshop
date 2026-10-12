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
    const body = await req.json();
    const { action } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

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
      if (agentMode === "manual") {
        // Pausar agente por 2 horas o hasta que el admin decida reactivar
        notesObj.manualUntil = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      } else {
        delete notesObj.manualUntil;
      }

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
7. Términos de búsqueda precisos en inglés para encontrarlo en tiendas de Estados Unidos.

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

          let responseText = "";
          const visionModels = ["gemini-2.5-flash-lite", "gemini-3.5-flash"];

          if (isBase64) {
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
                        { inlineData: { mimeType: "image/jpeg", data: base64Data } }
                      ]
                    }],
                    generationConfig: { responseMimeType: "application/json" }
                  })
                });
                if (!gRes.ok) continue;
                const gData = await gRes.json();
                const txt = gData.candidates?.[0]?.content?.parts?.[0]?.text;
                if (txt) {
                  responseText = txt;
                  break;
                }
              } catch {}
            }
          }

          if (responseText) {
            const parsed = JSON.parse(responseText);
            const query = encodeURIComponent(parsed.searchQueryUSA || parsed.productName);
            const rawQuery = parsed.searchQueryUSA || parsed.productName;
            const usd = Number(parsed.storePriceUSD || 10);
            const costMxn = Math.round(Number(parsed.estimatedCostMXN || (usd * 18.5 + 25)));
            const saleMxn = Math.round(Number(parsed.suggestedSalePriceMXN || Math.round(costMxn * 1.55)));
            const profitMxn = Math.round(saleMxn - costMxn);
            const marginPct = costMxn > 0 ? Math.round((profitMxn / costMxn) * 100) : 55;

            // Determinar enlace directo a la tienda oficial de la marca
            let officialStoreUrl = "";
            let officialStoreName = parsed.suggestedStore || "Tienda Oficial";
            const brandLower = (parsed.brand || "").toLowerCase();

            if (brandLower.includes("bath") || brandLower.includes("body works")) {
              officialStoreUrl = `https://www.bathandbodyworks.com/s?q=${query}`;
              officialStoreName = "Bath & Body Works Oficial";
            } else if (brandLower.includes("victoria") || brandLower.includes("secret")) {
              officialStoreUrl = `https://www.victoriassecret.com/us/search?q=${query}`;
              officialStoreName = "Victoria's Secret Oficial";
            } else if (brandLower.includes("nike")) {
              officialStoreUrl = `https://www.nike.com/w?q=${query}`;
              officialStoreName = "Nike Store USA";
            } else if (brandLower.includes("coach")) {
              officialStoreUrl = `https://www.coachoutlet.com/search?q=${query}`;
              officialStoreName = "Coach Outlet USA";
            } else if (brandLower.includes("stanley")) {
              officialStoreUrl = `https://www.stanley1913.com/search?q=${query}`;
              officialStoreName = "Stanley 1913 Oficial";
            } else {
              officialStoreUrl = `https://www.google.com/search?q=${encodeURIComponent(rawQuery + " buy online usa store")}`;
              officialStoreName = parsed.suggestedStore || "Tienda Online USA";
            }

            return {
              id: msg.id,
              productName: parsed.productName || "Artículo solicitado",
              brand: parsed.brand || "Sin marca",
              clientPrice: parsed.clientPrice || msg.text || "N/A",
              category: parsed.category || "General",
              suggestedStore: officialStoreName,
              officialStoreUrl,
              storePriceUSD: usd,
              estimatedCostMXN: costMxn,
              suggestedSalePriceMXN: saleMxn,
              estimatedProfitMXN: profitMxn,
              profitMarginPct: marginPct,
              searchQueryUSA: parsed.searchQueryUSA || parsed.productName,
              imageUrl: msg.media_url,
              timestamp: msg.created_at,
              links: {
                officialStore: officialStoreUrl,
                amazon: `https://www.amazon.com/s?k=${query}`,
                walmart: `https://www.walmart.com/search?q=${query}`,
                target: `https://www.target.com/s?searchTerm=${query}`,
                googleShopping: `https://www.google.com/search?tbm=shop&q=${query}`,
              }
            };
          } else {
            const query = encodeURIComponent(msg.text || "articulos importacion usa");
            return {
              id: msg.id,
              productName: msg.text || "Artículo en foto",
              brand: "N/A",
              clientPrice: msg.text || "N/A",
              category: "General",
              suggestedStore: "Bath & Body Works / Tienda USA",
              officialStoreUrl: `https://www.bathandbodyworks.com/s?q=${query}`,
              storePriceUSD: 10,
              estimatedCostMXN: 210,
              suggestedSalePriceMXN: 340,
              estimatedProfitMXN: 130,
              profitMarginPct: 62,
              searchQueryUSA: msg.text || "usa import",
              imageUrl: msg.media_url,
              timestamp: msg.created_at,
              links: {
                officialStore: `https://www.bathandbodyworks.com/s?q=${query}`,
                amazon: `https://www.amazon.com/s?k=${query}`,
                walmart: `https://www.walmart.com/search?q=${query}`,
                target: `https://www.target.com/s?searchTerm=${query}`,
                googleShopping: `https://www.google.com/search?tbm=shop&q=${query}`,
              }
            };
          }
        } catch {
          const query = encodeURIComponent(msg.text || "producto importado");
          return {
            id: msg.id,
            productName: msg.text || "Artículo en foto",
            brand: "N/A",
            clientPrice: msg.text || "N/A",
            category: "General",
            searchQueryUSA: msg.text || "usa import",
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
