import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

const WHATSAPP_GROUP_URL =
  "https://chat.whatsapp.com/BFB3Fo9akFBAAQ6RjMYhWo?s=cl&p=i&iam=2";

interface WeeklyPiecePlan {
  platform: "instagram_reel" | "instagram_post" | "tiktok";
  hook_text: string;
  caption_text: string;
  visual_direction: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const weekLabel = String(body.weekLabel || "Semana 48: Drops Exclusivos WhatsApp");
    const theme = String(body.theme || "Drops Exclusivos Bath & Body Works");

    const supabase = createServerClient() as any;
    const geminiKey = (process.env.GEMINI_API_KEY || "").trim();

    // 1. Crear campaña en Supabase
    const { data: campData } = await supabase
      .from("campaigns")
      .insert({
        week_label: weekLabel,
        theme,
        goal: "Tráfico al grupo VIP de WhatsApp",
        status: "active",
      })
      .select()
      .single();

    const campaignId = campData?.id ?? null;

    // 2. Mover a Mateo (CMO) a estado working
    await supabase
      .from("agent_states")
      .update({
        current_x: 19,
        current_y: 26,
        status: "working",
        speech_bubble: "Diseñando estrategia semanal...",
        updated_at: new Date().toISOString(),
      })
      .eq("agent_id", "mateo");

    await supabase.from("activity_logs").insert({
      campaign_id: campaignId,
      from_agent: "mateo",
      to_agent: "valeria",
      action_message: `Mateo inició la planeación de "${weekLabel}"`,
    });

    // 3. Generar plan de 5 piezas (3 Instagram + 2 TikTok) con gemini-2.5-flash
    let piecesPlan: WeeklyPiecePlan[] = [];
    if (geminiKey) {
      try {
        const prompt = `Eres Mateo (CMO) y Valeria (Copywriter) de FoxDrop (foxdrop.mx), marca mexicana de Drops Exclusivos.
Genera exactamente 5 piezas semanales (3 para Instagram: "instagram_reel" o "instagram_post", y 2 para TikTok: "tiktok") para el tema: "${theme}".
REGLAS:
- NUNCA uses "lotes", "pacas", "saldos" ni menciones ciudades específicas de México.
- Usa español natural de México ("piezas exclusivas", "favoritos seleccionados", "a precio especial").
- Todo CTA debe dirigir al grupo VIP de WhatsApp: ${WHATSAPP_GROUP_URL}
Devuelve ÚNICAMENTE un JSON array válido con 5 objetos:
[
  {
    "platform": "instagram_reel",
    "hook_text": "Gancho corto de 3 segundos",
    "caption_text": "Copy completo con CTA al grupo de WhatsApp",
    "visual_direction": "Descripción breve del combo de productos Bath & Body Works"
  }
]`;
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.75, maxOutputTokens: 2048 },
            }),
          }
        );
        const j = await res.json();
        const raw = (j?.candidates?.[0]?.content?.parts?.[0]?.text || "")
          .replace(/```json|```/gi, "")
          .trim();
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          piecesPlan = parsed.slice(0, 5);
        }
      } catch {}
    }

    if (piecesPlan.length === 0) {
      piecesPlan = [
        {
          platform: "instagram_reel",
          hook_text: "¿Pagas precio completo por tus brumas favoritas?",
          caption_text: `Cada semana soltamos piezas exclusivas de Bath & Body Works a precio especial en nuestro grupo VIP. Únete aquí: ${WHATSAPP_GROUP_URL}`,
          visual_direction: "Trío de Brumas Bath & Body Works en podio esmeralda",
        },
        {
          platform: "instagram_post",
          hook_text: "Tu rutina de 3 pasos para oler increíble todo el día",
          caption_text: `Jabón + Crema + Bruma en piezas limitadas. Entra al grupo VIP antes de que se agoten: ${WHATSAPP_GROUP_URL}`,
          visual_direction: "Set de 3 pasos Bath & Body Works",
        },
        {
          platform: "instagram_reel",
          hook_text: "Lo que acaba de llegar al drop de esta semana ⚡",
          caption_text: `Favoritos seleccionados de Bath & Body Works directo en Ventas Flash ⚡ FoxDrop: ${WHATSAPP_GROUP_URL}`,
          visual_direction: "Combo Bath & Body Works edición limitada",
        },
        {
          platform: "tiktok",
          hook_text: "POV: Entraste al grupo VIP antes de que se acabaran",
          caption_text: `Comenta VIP o entra directo al grupo de WhatsApp para ver los precios especiales: ${WHATSAPP_GROUP_URL}`,
          visual_direction: "Trío de fragancias Bath & Body Works 9:16",
        },
        {
          platform: "tiktok",
          hook_text: "3 aromas de Bath & Body Works que siempre vuelan",
          caption_text: `Solo en nuestro grupo privado de WhatsApp. Asegura tu pieza hoy: ${WHATSAPP_GROUP_URL}`,
          visual_direction: "Top 3 Bath & Body Works en estudio esmeralda",
        },
      ];
    }

    // 4. Actualizar a Valeria y Diego a working
    await supabase
      .from("agent_states")
      .update({
        status: "working",
        speech_bubble: "Redactando copys de la semana...",
        updated_at: new Date().toISOString(),
      })
      .eq("agent_id", "valeria");

    await supabase
      .from("agent_states")
      .update({
        status: "working",
        speech_bubble: "Componiendo visual con productos reales...",
        updated_at: new Date().toISOString(),
      })
      .eq("agent_id", "diego");

    // 5. Generar visuales reales invocando /api/admin/ads/campaign y guardar en deliverables
    const origin = req.nextUrl.origin;
    const insertedDeliverables: any[] = [];

    for (let i = 0; i < piecesPlan.length; i++) {
      const piece = piecesPlan[i];
      let generatedImageUrl = "";

      try {
        const adRes = await fetch(`${origin}/api/admin/ads/campaign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objective: piece.visual_direction,
            platform: piece.platform === "tiktok" ? "tiktok" : "instagram",
            generateImage: true,
          }),
        });
        const adJson = await adRes.json();
        generatedImageUrl = adJson?.imageUrl || "";
      } catch {}

      const scheduled = new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString();
      const { data: deliv } = await supabase
        .from("deliverables")
        .insert({
          campaign_id: campaignId,
          platform: piece.platform,
          scheduled_date: scheduled,
          hook_text: piece.hook_text,
          caption_text: piece.caption_text,
          flux_prompt: piece.visual_direction,
          image_url: generatedImageUrl,
          status: "pending_approval",
          created_by_agents: ["valeria", "diego"],
        })
        .select()
        .single();

      if (deliv) insertedDeliverables.push(deliv);
    }

    // 6. Mover a Valeria (47, 52) y Diego (53, 52) a la Mesa de Aprobación
    await supabase
      .from("agent_states")
      .update({
        current_x: 47,
        current_y: 52,
        status: "waiting_approval",
        speech_bubble: "5 copys en Mesa de Aprobación",
        updated_at: new Date().toISOString(),
      })
      .eq("agent_id", "valeria");

    await supabase
      .from("agent_states")
      .update({
        current_x: 53,
        current_y: 52,
        status: "waiting_approval",
        speech_bubble: "5 visuales listos para revisión",
        updated_at: new Date().toISOString(),
      })
      .eq("agent_id", "diego");

    await supabase.from("activity_logs").insert({
      campaign_id: campaignId,
      from_agent: "diego",
      to_agent: "admin",
      action_message: `Valeria y Diego entregaron ${insertedDeliverables.length} piezas reales en Mesa de Aprobación`,
    });

    return NextResponse.json({
      ok: true,
      campaignId,
      count: insertedDeliverables.length,
      deliverables: insertedDeliverables,
    });
  } catch (err: any) {
    console.error("[agency/generate-week] error:", err);
    return NextResponse.json(
      { error: err?.message || "Error generando campaña semanal" },
      { status: 500 }
    );
  }
}
