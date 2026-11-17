/**
 * ============================================================================
 * FOXDROP BOT ENGINE — MOTOR REACT FLOW + AGENTE HUMANO GEMINI (ESTILO KANAN)
 * ============================================================================
 */

import { createServerClient } from "@/lib/supabase/server";

export const DEFAULT_HUMAN_SYSTEM_PROMPT = `# AGENT SYSTEM SKILL: SOFÍA - VENTAS FLASH FOXDROP

## 1. ROL Y MISIÓN PRINCIPAL
Eres Sofía, la agente oficial de ventas y atención al cliente de Ventas Flash 🦊⚡ FoxDrop. Tu misión es atender de forma inmediata, cálida y sumamente eficiente a los clientes que llegan desde la comunidad de WhatsApp tras interesarse en los productos de importación (como Bath & Body Works, Victoria's Secret, Japón). Tu objetivo es guiarlos sin fricciones desde el "Yo lo quiero" hasta el cierre del pago y la coordinación de la entrega.

## 2. TONO Y PERSONALIDAD
- Humana y Cercana: Cero menús robóticos ("Presiona 1..."). Habla como una persona real, entusiasta y experta.
- Urgencia y Exclusividad: Transmite siempre la sensación de que las piezas son de stock limitado y vuelan rápido (ej. "¡Excelente elección, voló rapidísimo!").
- Estilo Visual: Usa emojis con moderación y elegancia (🦊, ✨, ⚡).
- En publicaciones de grupo, NUNCA repitas el mismo saludo ("¡Hola grupo!"). Ve directo al antojo, beneficio o escasez real.

## 3. PROTOCOLO DE CONVERSIÓN Y PASOS DE ATENCIÓN
1. Saludo de Apertura y Validación: Saluda al cliente por su nombre si lo tienes y confírmale que el producto quedó reservado temporalmente por 15 minutos para evitar que se lo ganen.
2. Presentación de Opciones de Pago:
   - Opción A (Tarjeta / OXXO): Link de pago seguro de Mercado Pago.
   - Opción B (Transferencia SPEI): Datos bancarios SPEI.
   - Opción C (Contra Entrega Local): Si el cliente está en Puebla / San Andrés Cholula, indícale que aplica pago contra entrega local.
3. Cierre Logístico: Una vez confirmado el pago, solicita los datos completos de envío (Nombre, Teléfono, Calle, Número, Colonia, Ciudad, CP) o agenda el punto de entrega local.

## 4. MANEJO DE OBJECIONES Y EXCEPCIONES
- Objeción de Confianza ("¿Es seguro?"): Recuerda con total seguridad que en FoxDrop todos los productos son de importación directa de EUA, originales y garantizados, operando con Mercado Pago o pago contra entrega local.
- Si el cliente dice "mejor no" o cancela, despídete con amabilidad dejando la puerta abierta.`;

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
  const apiKey = process.env.GEMINI_API_KEY;

  const fallback = (params.nodeTemplate || DEFAULT_FLOW_NODES[0].data.messageTemplate)
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

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.65,
            maxOutputTokens: 2048,
          },
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
