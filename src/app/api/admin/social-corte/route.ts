import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { sendViaWhatsAppBridge } from "@/lib/botEngine";

/**
 * POST /api/admin/social-corte
 * Cierra la jornada de Personal Shopper:
 * 1. Agrupa apartados activos por cliente y les manda su resumen total por privado.
 * 2. Avisa en el grupo de WhatsApp que cerró el corte del día.
 */
export async function POST(req: NextRequest) {
  try {
    const { groupJid } = await req.json();
    const supabase = createServerClient();

    const { data: activeRes } = await (supabase as any)
      .from("inventory_reservations")
      .select("*")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString());

    if (!activeRes || activeRes.length === 0) {
      return NextResponse.json({ success: true, clientsNotified: 0, message: "No hay apartados activos para corte." });
    }

    const { data: products } = await (supabase as any).from("products").select("*");
    const prodMap = new Map<string, any>((products || []).map((p: any) => [p.id, p]));

    // Agrupar por teléfono/cliente
    const byPhone = new Map<string, any[]>();
    for (const r of activeRes) {
      const list = byPhone.get(r.phone) || [];
      list.push(r);
      byPhone.set(r.phone, list);
    }

    let notified = 0;
    for (const [phone, items] of byPhone.entries()) {
      let total = 0;
      const lines = items.map((item) => {
        const p = prodMap.get(item.product_id);
        const price = Number(p?.public_price ?? p?.publicPrice ?? p?.price ?? 0);
        total += price * Number(item.qty || 1);
        return `• ${p?.title || p?.name || item.sku} ($${price} MXN)`;
      });

      const msg = `¡Hola! Ya hicimos el corte de tu bolsita de hoy en FoxDrop 🦊🛍️\n\n${lines.join("\n")}\n\nTotal: *$${total} MXN* (aprovechando un solo envío).\n\n¿Cómo cerramos tu pago? Tarjeta (Mercado Pago), transferencia SPEI o contra entrega en Puebla/Cholula ✨`;
      const ok = await sendViaWhatsAppBridge(phone, msg);
      if (ok) notified++;
    }

    if (groupJid) {
      await sendViaWhatsAppBridge(
        groupJid,
        "¡Listo por hoy! 🦊✨ Ya cerramos el recorrido y les mandé por privado el resumen de su bolsita. ¡Mil gracias!"
      );
    }

    return NextResponse.json({ success: true, clientsNotified: notified });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error en corte del día" }, { status: 500 });
  }
}
