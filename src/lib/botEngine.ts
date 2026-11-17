/**
 * ============================================================================
 * FOXDROP BOT ENGINE — MOTOR REACT FLOW + AGENTE HUMANO GEMINI (ESTILO KANAN)
 * ============================================================================
 */

import { createServerClient } from "@/lib/supabase/server";

export const DEFAULT_HUMAN_SYSTEM_PROMPT = `Eres Sofía, asesora de ventas de FoxDrop (tienda de importación en México).
Tu tono es cálido, cercano, amable y 100% humano (como una persona real escribiendo por WhatsApp, NUNCA suenes como robot ni uses frases corporativas frías).
Reglas de estilo:
- Usa mensajes cortos, claros y naturales, con 1 o 2 emojis máximo (ej. 🦊, ✨, 😊).
- Tutéa al cliente con respeto ("¡Hola! Qué gusto saludarte", "Claro que sí, con mucho gusto").
- Si el cliente ya tiene un producto apartado, recuérdale amablemente que ya se lo apartamos con gusto y ofrécele las opciones de pago de forma sencilla (sin mencionar límites de minutos ni sonar apresurado):
  1) Link de Mercado Pago (tarjeta, OXXO o meses)
  2) Transferencia SPEI
- Si el cliente hace una pregunta sobre el producto o envío, respóndele con calidez antes de invitarlo a cerrar su pago.`;

export const DEFAULT_FLOW_NODES = [
  {
    id: "start",
    type: "input",
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
  productName?: string;
  sku?: string;
  price?: number;
  nodeTemplate?: string;
  paymentLink?: string;
}): Promise<string> {
  const flow = await getActiveBotFlow();
  const apiKey = process.env.GEMINI_API_KEY;

  const fallback = (params.nodeTemplate || DEFAULT_FLOW_NODES[0].data.messageTemplate)
    .replace(/\{\{product_name\}\}/g, params.productName || "tu producto")
    .replace(/\{\{sku\}\}/g, params.sku || "FX")
    .replace(/\{\{price\}\}/g, String(params.price ?? ""))
    .replace(/\{\{payment_link\}\}/g, params.paymentLink || "https://foxdrop.mx");

  if (!apiKey) return fallback;

  try {
    const prompt = `${flow.systemPrompt}

Contexto actual de la conversación:
- Producto apartado: ${params.productName || "N/A"} (SKU: ${params.sku || "N/A"}, Precio: $${params.price ?? 0} MXN)
- Guía del paso actual del flujo: ${fallback}
- Mensaje del cliente: "${params.userMessage}"

Redacta la respuesta exacta para enviar por WhatsApp siguiendo la guía del paso actual, pero con tu toque humano, cálido y natural. No inventes precios ni datos bancarios distintos a los de la guía.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.65, maxOutputTokens: 320 },
        }),
      }
    );

    const json = await res.json();
    const reply = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
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
