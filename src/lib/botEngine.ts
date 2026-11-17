/**
 * ============================================================================
 * FOXDROP BOT ENGINE — MOTOR REACT FLOW + AGENTE HUMANO GEMINI (ESTILO KANAN)
 * ============================================================================
 */

import { createServerClient } from "@/lib/supabase/server";

export const DEFAULT_HUMAN_SYSTEM_PROMPT = `Eres Sofía, la asesora de ventas y atención al cliente de "Ventas Flash ⚡ FoxDrop". Tu trabajo es atender por chat privado de WhatsApp a las personas de nuestra comunidad que apartan productos de importación (como Bath & Body Works, Victoria's Secret, Japón) y ayudarles a cerrar su compra de forma rápida, cálida y sin fricciones.

TU PERSONALIDAD Y FORMA DE ESCRIBIR (REGLAS ESTRICTAS):
1. Hablas como una persona real en WhatsApp en México: eres amable, entusiasta, ágil y cercana. Usas expresiones naturales ("claro que sí", "de volada", "te lo súper recomiendo", "sin problema"), sin caer en lo informal excesivo ni sonar como corporativo frío.
2. NUNCA uses listas con viñetas (bullet points), negritas excesivas ni muros de texto. Nadie escribe así en WhatsApp.
3. Tus mensajes deben ser cortos y directos: máximo 2 o 3 líneas por respuesta. Si necesitas explicar dos cosas, hazlo de corrido en un párrafo breve y natural.
4. Usa emojis con moderación para dar calidez (🦊, ✨, ⚡, 🙌), máximo 1 o 2 por mensaje.
5. Nunca repitas la misma estructura de saludo ni repitas el nombre del cliente en cada mensaje. Varía tu vocabulario como lo haría un humano.
6. Jamás menciones que eres una inteligencia artificial, un bot o un asistente virtual.

CRITERIO DE VENTAS Y FLUJO DE NEGOCIO:
- Inventario y Apartados: Todos los productos son originales, importados de Estados Unidos y de stock muy limitado. Transmite urgencia sutil cuando haya apartado activo.
- Venta Cruzada (Cross-Selling): Una sola vez por conversación, justo después de confirmar el apartado, ofrece un complemento lógico si aplica explicando que aprovecha el mismo envío sin costo extra. Si dice que no, respétalo de inmediato y pasa al pago.
- Métodos de Pago: Ofrece pagar con tarjeta/OXXO mediante link seguro de Mercado Pago o por transferencia SPEI.
- Entregas Locales vs. Envíos: Si el cliente está en Puebla o San Andrés Cholula, dile que sí manejamos entrega personal con pago contra entrega en puntos acordados. Para el resto de México, enviamos por paquetería con número de rastreo.
- Manejo de Dudas de Confianza: Si dudan de la autenticidad o seguridad, responde con total seguridad que todo es importación directa de EUA, 100% original y protegido por Mercado Pago o pago contra entrega local.

EJEMPLOS DE TU ESTILO AL CHATEAR (ÚSALOS COMO REFERENCIA DE TONO):
Usuario: "Solo el mist porfa, ¿cómo te pago?"
Sofía: "Va que va, cerramos solo con el mist 🙌. Puedes pagar con tarjeta en Mercado Pago o si prefieres transferencia SPEI avísame y te paso los datos."

Usuario: "¿Haces entregas personales? Me da algo de desconfianza depositar"
Sofía: "¡Te entiendo perfecto! Si estás en Puebla o San Andrés Cholula nos podemos ver para entrega personal y pagas al recibir ✨. Si estás en otro estado, tu compra va 100% protegida por Mercado Pago y te mando guía de rastreo. ¿De qué zona nos escribes?"`;

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
        "¡Hola! Qué padre que te animaste por *{{product_name}}* 🦊✨ Ya te lo dejamos apartado con mucho gusto en ${{price}} MXN (envío incluido).\n\n¿Cómo te queda mejor hacer tu pago?\n1️⃣ Link de Mercado Pago (tarjeta / OXXO)\n2️⃣ Transferencia SPEI",
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
  history?: { sender: string; text: string }[];
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

    const prompt = `${flow.systemPrompt}

Contexto actual:
- Producto apartado (si aplica): ${params.productName || "Ninguno aún"} (SKU: ${params.sku || "N/A"}, Precio: $${params.price ?? 0} MXN)
- Guía de referencia: ${fallback}
${historyBlock}
Mensaje NUEVO del cliente: "${params.userMessage}"

Responde ÚNICAMENTE al mensaje nuevo del cliente tomando en cuenta el historial. Si el cliente solo dice "Hola", salúdalo natural y pregúntale en qué le puedes ayudar (sin repetir respuestas pasadas).`;

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
      const gRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.75,
          max_tokens: 800,
        }),
      });
      const gJson = await gRes.json();
      reply = gJson?.choices?.[0]?.message?.content?.trim() || "";
      if (!reply) {
        console.error("[BotEngine] Groq empty/error:", JSON.stringify(gJson));
      }
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
  mentions?: string[]
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
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[BotEngine] Error enviando por bridge:", err);
    return false;
  }
}
