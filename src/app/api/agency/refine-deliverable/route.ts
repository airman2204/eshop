import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { deliverableId, feedbackNotes = "" } = await req.json();
    if (!deliverableId) {
      return NextResponse.json({ error: "deliverableId es requerido" }, { status: 400 });
    }

    const supabase = createServerClient() as any;

    const { data: existing } = await supabase
      .from("deliverables")
      .select("*")
      .eq("id", deliverableId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Entregable no encontrado" }, { status: 404 });
    }

    // 1. Poner a Diego en estado working
    await supabase
      .from("agent_states")
      .update({
        status: "working",
        speech_bubble: "Regenerando composición con inventario...",
        updated_at: new Date().toISOString(),
      })
      .eq("agent_id", "diego");

    // 2. Llamar a /api/admin/ads/campaign para obtener una nueva imageUrl real
    const objective = feedbackNotes
      ? `${existing.flux_prompt || existing.hook_text}. Ajuste solicitado: ${feedbackNotes}`
      : existing.flux_prompt || existing.hook_text || "Drops Exclusivos Bath & Body Works";

    const adRes = await fetch(`${req.nextUrl.origin}/api/admin/ads/campaign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        objective,
        platform: existing.platform === "tiktok" ? "tiktok" : "instagram",
        generateImage: true,
      }),
    });
    const adJson = await adRes.json();
    const newImageUrl = adJson?.imageUrl || existing.image_url;

    // 3. Actualizar la fila en deliverables
    const { data: updated } = await supabase
      .from("deliverables")
      .update({
        image_url: newImageUrl,
        feedback_notes: feedbackNotes || existing.feedback_notes,
        status: "pending_approval",
      })
      .eq("id", deliverableId)
      .select()
      .single();

    // 4. Registrar en activity_logs y devolver a Diego a waiting_approval
    await supabase.from("activity_logs").insert({
      campaign_id: existing.campaign_id,
      from_agent: "diego",
      to_agent: "admin",
      action_message: feedbackNotes
        ? `Diego regeneró visual con ajuste: "${feedbackNotes}"`
        : `Diego regeneró la composición de "${existing.hook_text || "pieza"}"`,
    });

    await supabase
      .from("agent_states")
      .update({
        status: "waiting_approval",
        speech_bubble: "Nueva versión lista para revisar",
        updated_at: new Date().toISOString(),
      })
      .eq("agent_id", "diego");

    return NextResponse.json({ ok: true, deliverable: updated });
  } catch (err: any) {
    console.error("[agency/refine-deliverable] error:", err);
    return NextResponse.json(
      { error: err?.message || "Error regenerando entregable" },
      { status: 500 }
    );
  }
}
