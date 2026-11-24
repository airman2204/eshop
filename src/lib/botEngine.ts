/**
 * ============================================================================
 * FOXDROP BOT ENGINE — MOTOR REACT FLOW + AGENTE HUMANO GEMINI (ESTILO KANAN)
 * ============================================================================
 */

import { createServerClient } from "@/lib/supabase/server";

export const DEFAULT_HUMAN_SYSTEM_PROMPT = `Eres Sofía, Personal Shopper y asesora de ventas de "Ventas Flash ⚡ FoxDrop". Tu trabajo es atender por WhatsApp a las personas interesadas en nuestros productos de importación (Bath & Body Works, Victoria's Secret, Tree Hut, cuidado personal y coleccionables) y ayudarles de forma rápida, cálida, honesta y sin fricciones.

TU PERSONALIDAD Y FORMA DE ESCRIBIR (REGLAS ESTRICTAS):
1. Hablas 100% como mexicana real en WhatsApp (NUNCA uses modismos de España como "vosotros", "os", "vale", "monada", "genialidad"). Usa expresiones naturales de México ("claro que sí", "qué padre", "con gusto").
2. NUNCA uses listas con viñetas (bullet points), negritas excesivas ni muros de texto.
3. Tus mensajes deben ser cortos y directos: máximo 2 o 3 líneas por respuesta.
4. Usa emojis con moderación (🦊, ✨, 🛍️), máximo 1 por mensaje.
5. Nunca menciones que eres IA o bot.

REGLAS CRÍTICAS DE CONVERSACIÓN E INVENTARIO (OBLIGATORIAS):
- PROHIBIDO decir "déjame checar", "permíteme revisar" o "ahorita reviso": tú YA tienes el inventario completo en tiempo real abajo. Responde en ese mismo mensaje con el dato exacto.
- CONSULTA EXACTA DE STOCK Y PRECIOS: Revisa siempre el bloque "Inventario disponible en tiempo real".
  * Si el producto o fragancia SÍ aparece ahí (por ejemplo, si preguntan por "body Into the Night" y en la lista está "Bruma corporal importada fragancia Into the Night"), confirma de inmediato qué presentación tenemos, su precio exacto en MXN y cuántas piezas quedan si quedan pocas.
  * Si el producto o fragancia NO aparece en la lista de inventario disponible, NUNCA digas que sí lo tenemos: di con honestidad que por el momento lo tenemos agotado y sugiere 1 o 2 opciones similares que SÍ estén en la lista con su precio.
- MANEJO DEL NOMBRE Y LA "BOLSITA" (CERO BUCLES):
  * Si el cliente solo saluda ("Hola buenas tardes") o solo pregunta una duda/precio/existencia, salúdalo amablemente o respóndele su duda directa con precio. PROHIBIDO pedirle su nombre para "anotarlo en tu bolsita" cuando aún no ha pedido apartar nada.
  * Si en "Nombre del cliente" ya viene un nombre real (ej. "Paola", "Paola Álvarez") o el cliente ya dijo su nombre en el historial, PROHIBIDO volver a preguntar "¿Con quién tengo el gusto?".
  * Si el cliente acaba de decir su nombre y en mensajes anteriores había hecho una pregunta pendiente, NO le digas "¿En qué te puedo ayudar hoy?": contéstale directamente la pregunta que había hecho.
  * Solo pregunta amablemente "¿Con quién tengo el gusto?" UNA sola vez si el cliente ya pidió apartar/comprar algo y su nombre aparece como "Desconocido".

REGLAS DE PAGO Y ENTREGA FOXDROP:
- Todos los productos son 100% originales, importados de EUA y de stock limitado.
- Métodos de Pago (SIN OXXO y SIN MESES):
  1) Link seguro de Mercado Pago (tarjeta de débito o crédito)
  2) Transferencia SPEI
  3) Pago Contra Entrega Local (solo Puebla / San Andrés Cholula)
- Entregas Locales vs. Envíos:
  * Puntos de Encuentro Gratuitos ($0 MXN, pago contra entrega): Zerezotla, Plaza San Diego, Centro de San Pedro Cholula y Centro de San Andrés Cholula.
  * Envío a domicilio local: Zona Cholula ($30 MXN) y Zona Metropolitana de Puebla ($50 MXN).
  * Resto de México: paquetería con número de rastreo.`;

export const DEFAULT_FLOW_NODES = [
  {
    id: "welcome",
    type: "input",
    position: { x: 250, y: -110 },
    data: {
      label: "0. Bienvenida al Grupo",
      messageTemplate:
        "¡Hola{{client_name}}! Qué gusto tenerte por aquí{{group_name}} 🦊✨\n\nAquí compartimos novedades y piezas especiales recién llegadas con envío incluido. Si ves algo que te encante, solo responde *\"yo\"* a la foto y con gusto te lo apartamos.",
    },
  },
  {
    id: "start",
    position: { x: 250, y: 20 },
    data: {
      label: "1. Saludo DM + Resumen de Apartado (20 min)",
      messageTemplate:
        "¡Hola! Qué padre que te animaste por *{{product_name}}* 🦊✨ Ya te lo echamos a tu bolsita en ${{price}} MXN (envío incluido). ¿Con quién tengo el gusto?\n\nCuando gustes cerrar tu compra puedes pagar con:\n1️⃣ Tarjeta (Mercado Pago)\n2️⃣ Transferencia SPEI\n3️⃣ Contra entrega (Puebla / San Andrés Cholula)",
    },
  },
  {
    id: "mp_option",
    position: { x: 80, y: 180 },
    data: {
      label: "2A. Link Mercado Pago",
      messageTemplate:
        "¡Perfecto! Aquí tienes tu link seguro de Mercado Pago para *{{product_name}}*:\n{{payment_link}}\n\nEn cuanto quede listo me avisas o el sistema te manda tu ticket en automático 😊",
    },
  },
  {
    id: "spei_option",
    position: { x: 420, y: 180 },
    data: {
      label: "2B. Datos Transferencia SPEI",
      messageTemplate:
        "¡Súper! Puedes hacer tu transferencia SPEI por *${{price}} MXN* a:\n🏦 Banco: STP / Mercado Pago\n💳 CLABE: 646180157000000000\n👤 Beneficiario: FoxDrop MX\n📝 Concepto: {{sku}}\n\nApenas la hagas mándame fotito o captura del comprobante por aquí y te genero tu ticket al momento 🦊",
    },
  },
  {
    id: "ticket_done",
    type: "output",
    position: { x: 250, y: 340 },
    data: {
      label: "3. Pago Confirmado + Ticket Digital",
      messageTemplate:
        "🎉 ¡Listo! Confirmamos tu pago de *{{product_name}}*.\n🧾 Folio: #{{order_id}}\n¡Mil gracias por tu compra en FoxDrop! 🦊",
    },
  },
];

export const DEFAULT_FLOW_EDGES = [
  { id: "e-welcome-start", source: "welcome", target: "start", label: "Responde 'yo'" },
  { id: "e-start-mp", source: "start", target: "mp_option", label: "Opción 1 (MP)" },
  { id: "e-start-spei", source: "start", target: "spei_option", label: "Opción 2 (SPEI)" },
  { id: "e-mp-done", source: "mp_option", target: "ticket_done", label: "Webhook MP" },
  { id: "e-spei-done", source: "spei_option", target: "ticket_done", label: "Aprobar SPEI" },
];

/**
 * Obtiene el flujo activo de React Flow desde Supabase o devuelve el default.
 */
export async function getActiveBotFlow() {
  const supabase = createServerClient();
  const { data } = await (supabase as any)
    .from("bot_flows")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    systemPrompt: data?.system_prompt || DEFAULT_HUMAN_SYSTEM_PROMPT,
    nodes: Array.isArray(data?.nodes) && data.nodes.length > 0 ? data.nodes : DEFAULT_FLOW_NODES,
    edges: Array.isArray(data?.edges) && data.edges.length > 0 ? data.edges : DEFAULT_FLOW_EDGES,
  };
}

/**
 * Genera una respuesta humana con Gemini manteniendo el contexto del nodo actual.
 */
export async function generateHumanReply(params: {
  userMessage: string;
  clientName?: string;
  history?: { sender: string; text: string }[];
  catalogContext?: string;
  productName?: string;
  sku?: string;
  price?: number;
  nodeTemplate?: string;
  paymentLink?: string;
}): Promise<string> {
  const flow = await getActiveBotFlow();
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();

  const fallback = (
    params.nodeTemplate !== undefined
      ? params.nodeTemplate || "¡Hola! Qué gusto saludarte, ¿en qué te puedo ayudar hoy? 🦊✨"
      : DEFAULT_FLOW_NODES[0].data.messageTemplate
  )
    .replace(/\{\{client_name\}\}/g, "")
    .replace(/\{\{group_name\}\}/g, "")
    .replace(/\{\{product_name\}\}/g, params.productName || "tu producto")
    .replace(/\{\{sku\}\}/g, params.sku || "FX")
    .replace(/\{\{price\}\}/g, String(params.price ?? ""))
    .replace(/\{\{payment_link\}\}/g, params.paymentLink || "https://foxdrop.mx");

  if (!apiKey) return fallback;

  try {
    const historyBlock =
      Array.isArray(params.history) && params.history.length > 0
        ? `\nHistorial reciente de esta conversación (léelo para NO repetir respuestas y continuar el hilo natural):\n${params.history
            .map((m) => `- ${m.sender === "admin" ? "Sofía" : "Cliente"}: ${m.text}`)
            .join("\n")}\n`
        : "";

    const resolvedName =
      params.clientName &&
      !/^cliente(\s+whatsapp)?$/i.test(params.clientName.trim()) &&
      !/^\+?\d+$/.test(params.clientName.trim())
        ? params.clientName.trim()
        : "Desconocido";

    const prompt = `${flow.systemPrompt}

Contexto actual:
- Nombre del cliente: ${resolvedName}${resolvedName !== "Desconocido" ? " (YA CONOCES SU NOMBRE: NO vuelvas a preguntar '¿Con quién tengo el gusto?')" : ""}
- Producto apartado en carrito (si aplica): ${params.productName || "Ninguno aún"} (SKU: ${params.sku || "N/A"}, Total: $${params.price ?? 0} MXN)
${params.paymentLink ? `- Link de pago generado: ${params.paymentLink}\n` : ""}${params.catalogContext ? `\nInventario disponible en tiempo real (ÚNICA fuente de verdad para existencias y precios; NUNCA inventes productos que no estén aquí):\n${params.catalogContext}\n` : ""}${historyBlock}
Mensaje NUEVO del cliente: "${params.userMessage}"

Instrucciones finales para esta respuesta:
- Responde ÚNICAMENTE al mensaje nuevo tomando en cuenta todo el historial reciente.
- Si ya hay mensajes previos de Sofía en el historial, PROHIBIDO volver a saludar ("¡Hola!", "¡Qué tal!", "Buenas tardes").
- Si el cliente pregunta por un producto (ej. "body" = bruma corporal / splash), dale de inmediato la presentación exacta y el precio real del inventario sin decir "déjame checar".
- Responde en MÁXIMO 2 a 3 líneas naturales.`;

    let reply = "";
    const groqKey = (process.env.GROQ_API_KEY || "").trim();

    if (apiKey) {
      let res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.75,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      let json = await res.json();
      reply = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      if (!reply) {
        console.error("[BotEngine] Gemini 2.5 empty/error:", JSON.stringify(json));
      }
    }

    if (!reply && groqKey) {
      for (const groqModel of ["llama-3.3-70b-versatile", "openai/gpt-oss-120b"]) {
        const gRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: groqModel,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.75,
            max_tokens: 800,
          }),
        });
        const gJson = await gRes.json();
        reply = gJson?.choices?.[0]?.message?.content?.trim() || "";
        if (reply) break;
        console.error(`[BotEngine] Groq (${groqModel}) empty/error:`, JSON.stringify(gJson));
      }
    }

    if (reply && Array.isArray(params.history) && params.history.length > 0) {
      reply = reply.replace(/^¡?Hola[!,.:\s]*/i, "").trim();
      if (reply) reply = reply.charAt(0).toUpperCase() + reply.slice(1);
    }

    return reply || fallback;
  } catch (err) {
    console.error("[BotEngine] Error Gemini:", err);
    return fallback;
  }
}

/**
 * Envía un mensaje saliente a través del bridge de WhatsApp en Render.
 */
export async function sendViaWhatsAppBridge(
  to: string,
  message: string,
  quotedMessageId?: string,
  mentions?: string[],
  mediaUrl?: string
) {
  const bridgeUrl = process.env.WHATSAPP_BRIDGE_URL || "https://foxdrop-whatsapp-bridge.onrender.com";
  const apiKey = process.env.WHATSAPP_BRIDGE_API_KEY || "foxdrop_secret_2026";

  try {
    const res = await fetch(`${bridgeUrl}/message/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        number: to,
        phone: to,
        text: message,
        message,
        quotedMessageId,
        mentions,
        mediaUrl: mediaUrl || undefined,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[BotEngine] Error enviando por bridge:", err);
    return false;
  }
}
