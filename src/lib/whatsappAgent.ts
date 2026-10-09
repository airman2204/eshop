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
  options?: { maxOutputTokens?: number }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "TU_API_KEY_AQUI") {
    throw new Error("GEMINI_API_KEY no está configurada");
  }

  const models = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.8-flash"];
  let lastError = "";

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const contents: any[] = [];
      if (systemInstruction) {
        contents.push({
          role: "user",
          parts: [{ text: `INSTRUCCIÓN DEL SISTEMA:\n${systemInstruction}\n\nMENSAJE DEL CLIENTE:\n${prompt}` }],
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
            temperature: 0.6,
            maxOutputTokens: options?.maxOutputTokens || 1024,
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
      if (text) return text.trim();
    } catch (err: any) {
      lastError = err.message || "Error al conectar con Gemini";
    }
  }

  throw new Error(`Fallo de IA: ${lastError}`);
}

/**
 * Consulta la base de datos para armar el contexto relevante para el cliente:
 * - Últimos pedidos de ese teléfono
 * - Productos disponibles en el catálogo
 */
async function fetchClientContext(phone: string) {
  const supabase = createServerClient() as any;
  const rawDigits = phone.replace(/\D/g, "");
  const last10 = rawDigits.slice(-10);

  // 1. Buscar pedidos del cliente
  const { data: orders } = await supabase
    .from("orders")
    .select("id, client_name, status, total, shipping_type, pickup_point, tracking_number, created_at")
    .or(`client_phone.ilike.%${last10}%,client_phone.eq.${phone}`)
    .order("created_at", { ascending: false })
    .limit(3);

  // 2. Buscar muestra de productos activos
  const { data: products } = await supabase
    .from("products")
    .select("title, category, public_price, stock")
    .eq("is_active", true)
    .gt("stock", 0)
    .limit(12);

  return { orders: orders || [], products: products || [] };
}

/**
 * Genera la respuesta del Agente de WhatsApp con contexto comercial de FoxDrop
 */
export async function generateAgentWhatsAppReply(params: {
  phone: string;
  clientName: string;
  incomingMessage: string;
  recentMessages?: { sender: string; text: string }[];
}): Promise<{ reply: string; suggestedSticker?: string }> {
  const { phone, clientName, incomingMessage, recentMessages = [] } = params;

  const { orders, products } = await fetchClientContext(phone);

  const ordersContext = orders.length > 0
    ? orders.map((o: any) => 
        `- Folio: #${o.id} | Estado: ${o.status} | Total: $${o.total} MXN | Entrega: ${o.shipping_type || 'Puebla'} | Punto: ${o.pickup_point || 'N/A'} | Guía: ${o.tracking_number || 'N/A'}`
      ).join("\n")
    : "No tiene pedidos registrados aún con este teléfono.";

  const productsContext = products.length > 0
    ? products.map((p: any) => `- ${p.title} (${p.category}): $${p.public_price} MXN (Stock: ${p.stock})`).join("\n")
    : "Catálogo disponible en foxdrop.mx";

  const conversationHistory = recentMessages
    .slice(-6)
    .map(m => `${m.sender === 'client' ? 'Cliente' : 'FoxDrop'}: ${m.text}`)
    .join("\n");

  const systemInstruction = `Eres FoxBot 🦊, el Agente Oficial de Atención al Cliente y Ventas de FoxDrop Puebla (tienda online y física de importación exclusiva, gadgets, accesorios y coleccionables en Puebla, México).

REGLAS DE ATENCIÓN:
1. Sé cálido, profesional, entusiasta y muy servicial. Usa emojis acordes (🦊, ✨, 📦, 🚚, 🛍️) de forma natural y elegante.
2. Si el cliente pregunta sobre sus compras o pedidos, utiliza EXCLUSIVAMENTE los datos de pedidos proporcionados abajo. Si tiene un pedido reciente, indícale su estatus con total precisión.
3. Si el cliente pregunta por productos o precios, usa la lista de productos y anímalo a visitar la tienda oficial: foxdrop.mx.
4. Para métodos de pago aceptamos: Efectivo contra-entrega en Puebla, Transferencia SPEI, y Tarjeta/MercadoPago en la web.
5. Para envíos: En Puebla entregamos en puntos acordados o a domicilio local. También hacemos envíos a todo México por paquetería.
6. Mantén las respuestas CONCISAS (máximo 2 a 4 oraciones) ideales para leer cómodamente en WhatsApp.
7. NUNCA inventes folios ni guías que no estén en los datos.

DATOS DE ESTE CLIENTE:
Nombre: ${clientName}
Teléfono: ${phone}

PEDIDOS RECIENTES EN EL SISTEMA:
${ordersContext}

PRODUCTOS DESTACADOS EN TIENDA:
${productsContext}

HISTORIAL RECIENTE:
${conversationHistory || "Sin historial previo."}`;

  try {
    const aiText = await callGemini(incomingMessage, systemInstruction);

    // Sugerir sticker según contexto de la respuesta
    let suggestedSticker: string | undefined = undefined;
    const lower = aiText.toLowerCase();
    if (lower.includes("gracias") || lower.includes("un placer")) {
      suggestedSticker = "https://foxdrop.mx/stickers/sticker-gracias-compra.webp";
    } else if (lower.includes("en camino") || lower.includes("ruta")) {
      suggestedSticker = "https://foxdrop.mx/stickers/sticker-pedido-camino-1.webp";
    } else if (lower.includes("empaque") || lower.includes("almacén")) {
      suggestedSticker = "https://foxdrop.mx/stickers/sticker-pago-caja.webp";
    }

    return { reply: aiText, suggestedSticker };
  } catch (err: any) {
    console.error("Error generando respuesta del Agente:", err);
    return {
      reply: `¡Hola ${clientName.split(" ")[0]}! 🦊 Gracias por contactar a FoxDrop Puebla. En este momento estoy revisando tu mensaje, o si gustas puedes explorar nuestro catálogo y pedidos en foxdrop.mx. ¡En un instante te asistimos con todo gusto!`,
    };
  }
}

/**
 * Genera 3 sugerencias breves de respuesta para que Mario o Nydia las usen en 1 clic desde el panel
 */
export async function generateQuickReplySuggestions(params: {
  phone: string;
  clientName: string;
  lastMessage: string;
}): Promise<string[]> {
  const { phone, clientName, lastMessage } = params;
  const { orders } = await fetchClientContext(phone);

  const prompt = `El cliente ${clientName} acaba de enviar por WhatsApp: "${lastMessage}".
Tiene los siguientes pedidos: ${JSON.stringify(orders)}.

Genera exactamente 3 opciones de respuestas MUY BREVES (de 1 a 2 oraciones cada una) que el asesor de FoxDrop pueda enviar en 1 clic.
Devuélvelas en formato JSON con la clave "suggestions": ["Opción 1", "Opción 2", "Opción 3"].`;

  try {
    const res = await callGemini(prompt, "Eres un asistente de redacción rápida para WhatsApp FoxDrop. Devuelve solo JSON válido.");
    const match = res.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
        return parsed.suggestions.slice(0, 3);
      }
    }
  } catch {}

  // Fallbacks rápidos
  return [
    `¡Hola ${clientName.split(" ")[0]}! 🦊 Claro que sí, con mucho gusto te apoyo.`,
    `¡Hola! Déjame verificarlo en sistema de inmediato y te confirmo. 📦`,
    `¡Hola! Tu pedido ya está registrado y te mantenemos al tanto de cada paso. ✨`,
  ];
}
