import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

const WHATSAPP_GROUP_URL =
  "https://chat.whatsapp.com/BFB3Fo9akFBAAQ6RjMYhWo?s=cl&p=i&iam=2";

export async function POST(req: NextRequest) {
  try {
    const {
      agentId = "mateo",
      message = "",
      currentStrategy = "",
      weekLabel = "Semana 1: Drops Exclusivos WhatsApp",
    } = await req.json();

    const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
    const groqKey = (process.env.GROQ_API_KEY || "").trim();
    const supabase = createServerClient() as any;

    const { data: prods } = await supabase
      .from("products")
      .select("title,public_price")
      .ilike("title", "%Bath%Body%")
      .limit(12);

    const inventoryText = Array.isArray(prods) && prods.length > 0
      ? prods.map((p: any) => `- ${p.title} ($${p.public_price} MXN)`).join("\n")
      : "- Productos originales Bath & Body Works";

    const prompt = message
      ? `Eres ${agentId.toUpperCase()} de la agencia FoxDrop (foxdrop.mx).
El Director General te escribió en el chat: "${message}"
Plan semanal actual:
${currentStrategy || weekLabel}

Inventario real disponible:
${inventoryText}

Responde en español natural de México (directo, claro, sin "lotes/pacas/saldos").
Si te piden ajustar la estrategia o tienes que actualizar el plan de la semana (Lunes a Viernes para Instagram y TikTok), devuelve un JSON válido:
{
  "reply": "Tu respuesta breve y clara al Director General",
  "updatedStrategy": "El plan semanal completo actualizado (Lunes a Viernes, Instagram y TikTok, combos y CTA a ${WHATSAPP_GROUP_URL}) o cadena vacía si solo fue una pregunta"
}`
      : `Eres Mateo (CMO) de FoxDrop (foxdrop.mx). Arma una propuesta DETALLADA para "${weekLabel}" usando este inventario real de Bath & Body Works:
${inventoryText}

Incluye:
- Objetivo de la semana (llevar tráfico al grupo VIP de WhatsApp: ${WHATSAPP_GROUP_URL})
- Calendario detallado de Lunes a Viernes especificando qué se publica en Instagram y qué en TikTok, qué combo de 3 productos se usa y el ángulo de cada día.
- Español natural de México (sin "lotes", "pacas", "saldos").
Devuelve JSON válido:
{
  "reply": "Propuesta semanal lista en la Mesa de Aprobación. ¿Qué te parece o qué ajustamos?",
  "updatedStrategy": "Texto completo y bien estructurado del plan semanal (Lunes a Viernes, IG y TikTok)"
}`;

    if (geminiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
            }),
          }
        );
        const j = await res.json();
        const raw = (j?.candidates?.[0]?.content?.parts?.[0]?.text || "")
          .replace(/```json|```/gi, "")
          .trim();
        const parsed = JSON.parse(raw);
        if (groqKey) {
      try {
        const gRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 1800,
            response_format: { type: "json_object" },
          }),
        });
        const gJson = await gRes.json();
        const raw = (gJson?.choices?.[0]?.message?.content || "").trim();
        const parsed = JSON.parse(raw);
        return NextResponse.json({
          ok: true,
          reply: parsed.reply || "Listo, actualizado.",
          updatedStrategy: parsed.updatedStrategy || "",
        });
      } catch {}
    }

    return NextResponse.json({
          ok: true,
          reply: parsed.reply || "Listo, actualizado.",
          updatedStrategy: parsed.updatedStrategy || "",
        });
      } catch {}
    }

    if (groqKey) {
      try {
        const gRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 1800,
            response_format: { type: "json_object" },
          }),
        });
        const gJson = await gRes.json();
        const raw = (gJson?.choices?.[0]?.message?.content || "").trim();
        const parsed = JSON.parse(raw);
        return NextResponse.json({
          ok: true,
          reply: parsed.reply || "Listo, actualizado.",
          updatedStrategy: parsed.updatedStrategy || "",
        });
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      reply: "Propuesta semanal lista. Puedes editarla o pedir ajustes aquí.",
      updatedStrategy:
        currentStrategy ||
        `📅 PLAN SEMANAL — ${weekLabel}\n• Lunes (Instagram Reel): Trío de Brumas Bath & Body Works — Gancho de precio especial en WhatsApp VIP.\n• Martes (TikTok): Rutina de 3 pasos (Jabón + Crema + Bruma) — Storytelling.\n• Miércoles (Instagram Post/Carousel): Comparativa de aromas top + CTA directo al grupo.\n• Jueves (TikTok): "POV: Entraste antes de que volaran" — Urgencia de piezas limitadas.\n• Viernes (Instagram Reel): Cierre de Drop semanal + enlace directo a Ventas Flash ⚡ FoxDrop.`,
    });
  } catch (err: any) {
    if (groqKey) {
      try {
        const gRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 1800,
            response_format: { type: "json_object" },
          }),
        });
        const gJson = await gRes.json();
        const raw = (gJson?.choices?.[0]?.message?.content || "").trim();
        const parsed = JSON.parse(raw);
        return NextResponse.json({
          ok: true,
          reply: parsed.reply || "Listo, actualizado.",
          updatedStrategy: parsed.updatedStrategy || "",
        });
      } catch {}
    }

    return NextResponse.json({ error: err?.message || "Error en chat" }, { status: 500 });
  }
}
