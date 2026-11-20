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

    const roleGuides: Record<string, string> = {
      mateo: "Eres Mateo (CMO). Diseñas la estrategia semanal con enfoque de embudo (Atracción en IG/TikTok -> Tráfico a WhatsApp VIP -> Cierre), priorizando productos con mejor rotación y margen, y proponiendo tests de presupuesto basados en evidencia.",
      valeria: "Eres Valeria (Copywriter). Aplicas frameworks AIDA y PAS, y principios de AI Content Improver: ganchos de 3s sin relleno, tono natural de México, manejo de objeciones y CTAs claros.",
      diego: "Eres Diego (Director de Arte). Aplicas principios de Ad Creative: variaciones de alto contraste, jerarquía visual limpia (esmeralda #14352F + dorado #D96B27) y combos coherentes de productos reales.",
      andres: "Eres Andrés (Media Buyer). Aplicas principios de Ad Campaign Analyzer: analizas segmentación, creativos ganadores, CPA/ROAS sin sobreestimar causalidad y propones tests de presupuesto en Meta/TikTok Ads.",
      camila: "Eres Camila (Community Manager). Optimizas horarios de publicación, retención en Reels/TikTok y dinámicas de comentarios/DM con palabra clave.",
      sofia: "Eres Sofía (Ejecutiva de Ventas WA). Optimizas la bienvenida al grupo VIP, urgencia ética de piezas limitadas y cierres por WhatsApp.",
      bruno: "Eres Bruno (Analista ROI). Aplicas principios de Ad Campaign Analyzer: cuantificas incertidumbre, evalúas conversión por pieza, ticket promedio y detectas cuellos de botella en el embudo.",
    };
    const rolePrompt = roleGuides[agentId] || roleGuides.mateo;

    const prompt = message
      ? `${rolePrompt}
El Director General te escribió en el chat: "${message}"
Plan semanal actual:
${currentStrategy || weekLabel}

Inventario real disponible:
${inventoryText}

Responde en español natural de México (directo, analítico, sin "lotes/pacas/saldos").
Si te piden ajustar la estrategia o tienes que actualizar el plan de la semana (Lunes a Viernes para Instagram y TikTok), devuelve un JSON válido:
{
  "reply": "Tu respuesta analítica y accionable al Director General",
  "updatedStrategy": "El plan semanal completo actualizado (Lunes a Viernes, Instagram y TikTok, combos, ángulo AIDA/PAS y CTA a ${WHATSAPP_GROUP_URL}) o cadena vacía si solo fue una pregunta"
}`
      : `${rolePrompt} Arma una propuesta DETALLADA para "${weekLabel}" usando este inventario real de Bath & Body Works:
${inventoryText}

Incluye:
- Objetivo de embudo de la semana (Atracción IG/TikTok -> Grupo VIP de WhatsApp: ${WHATSAPP_GROUP_URL} -> Cierre)
- Calendario detallado de Lunes a Viernes especificando red social (Instagram o TikTok), formato, combo de 3 productos, gancho AIDA/PAS y CTA.
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
    return NextResponse.json({ error: err?.message || "Error en chat" }, { status: 500 });
  }
}
