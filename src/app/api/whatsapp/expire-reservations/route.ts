import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendViaWhatsAppBridge } from "@/lib/botEngine";

/**
 * GET /api/whatsapp/expire-reservations
 * Llamado periódicamente por el KeepAlive de Render (cero costo extra).
 * Marca apartados vencidos como 'expired' y avisa automáticamente al grupo.
 */
export async function GET() {
  try {
    const supabase = createServerClient();
    const nowIso = new Date().toISOString();
    const fiveMinsFromNow = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // 1. Recordatorio amable 5 minutos antes de que expire
    const { data: soonList } = await (supabase as any)
      .from("inventory_reservations")
      .select("id, product_id, sku, phone, spei_validation")
      .eq("status", "active")
      .gt("expires_at", nowIso)
      .lte("expires_at", fiveMinsFromNow);

    for (const item of soonList || []) {
      if (item.spei_validation?.reminded) continue;
      const { data: prod } = await (supabase as any)
        .from("products")
        .select("title")
        .eq("id", item.product_id)
        .maybeSingle();
      const prodName = prod?.title || item.sku;
      await sendViaWhatsAppBridge(
        item.phone,
        `Oye, ¿sí cerramos tu *${prodName}* o lo soltamos para el grupo? 😊`
      );
      await (supabase as any)
        .from("inventory_reservations")
        .update({ spei_validation: { ...(item.spei_validation || {}), reminded: true } })
        .eq("id", item.id);
    }

    const { data: expiredList } = await (supabase as any)
      .from("inventory_reservations")
      .select("id, product_id, sku")
      .eq("status", "active")
      .lte("expires_at", nowIso);

    if (!expiredList || expiredList.length === 0) {
      return NextResponse.json({ expired: 0 });
    }

    // Obtener el primer grupo activo desde el bridge para avisar
    const bridgeUrl = process.env.WHATSAPP_BRIDGE_URL || "https://foxdrop-whatsapp-bridge.onrender.com";
    const apiKey = process.env.WHATSAPP_BRIDGE_API_KEY || "foxdrop_secret_2026";
    let targetGroupJid = "";
    try {
      const gRes = await fetch(`${bridgeUrl}/groups`, { headers: { "x-api-key": apiKey } });
      const gJson = await gRes.json();
      if (Array.isArray(gJson?.groups) && gJson.groups.length > 0) {
        targetGroupJid = gJson.groups[0].id;
      }
    } catch {}

    for (const resItem of expiredList) {
      await (supabase as any)
        .from("inventory_reservations")
        .update({ status: "expired" })
        .eq("id", resItem.id);

      if (targetGroupJid) {
        const { data: prod } = await (supabase as any)
          .from("products")
          .select("*")
          .eq("id", resItem.product_id)
          .maybeSingle();

        const prodName = prod?.title || prod?.name || resItem.sku;
        const prodPrice = Number(prod?.public_price ?? prod?.publicPrice ?? prod?.price ?? 0);

        await sendViaWhatsAppBridge(
          targetGroupJid,
          `¡Buenas noticias! Se acaba de liberar *${prodName}* ($${prodPrice} MXN con envío incluido) 🦊✨ Si alguien se anima, solo responda *"yo"* para apartarlo.`
        );
      }
    }

    return NextResponse.json({ expired: expiredList.length });
  } catch (err: any) {
    console.error("[ExpireReservations] Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
