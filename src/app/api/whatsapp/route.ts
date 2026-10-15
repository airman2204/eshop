import { NextRequest, NextResponse } from "next/server";
import { notifyAbandonedCartRecovery } from "@/lib/whatsapp";
import { dispatchOrderStatusNotification } from "@/lib/orderNotifications";

import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, orderNumber, clientName, clientPhone, total, newStatus, discountCode } = body;

    if (action === "merge_chats") {
      const { sourceChatId, targetChatId, lid } = body;
      if (!sourceChatId || !targetChatId) {
        return NextResponse.json({ error: "sourceChatId y targetChatId requeridos" }, { status: 400 });
      }

      const supabase = createServerClient() as any;

      const { data: sourceChat } = await supabase
        .from("whatsapp_chats")
        .select("*")
        .eq("id", sourceChatId)
        .maybeSingle();

      const { data: targetChat } = await supabase
        .from("whatsapp_chats")
        .select("*")
        .eq("id", targetChatId)
        .maybeSingle();

      if (!sourceChat || !targetChat) {
        return NextResponse.json({ error: "Chats no encontrados para fusionar" }, { status: 404 });
      }

      // Mover mensajes
      await supabase
        .from("whatsapp_messages")
        .update({
          chat_id: targetChat.id,
          phone: targetChat.phone,
        })
        .eq("chat_id", sourceChat.id);

      // Actualizar notas y LID
      let targetNotes: any = {};
      try {
        targetNotes = typeof targetChat.notes === "string" ? JSON.parse(targetChat.notes) : (targetChat.notes || {});
      } catch {}

      const cleanLid = lid || sourceChat.phone;
      targetNotes.lid = cleanLid;
      if (sourceChat.client_name && sourceChat.client_name !== targetChat.client_name) {
        targetNotes.alias = sourceChat.client_name;
      }

      await supabase
        .from("whatsapp_chats")
        .update({
          notes: JSON.stringify(targetNotes),
          last_message: sourceChat.last_message || targetChat.last_message,
          last_message_time: sourceChat.last_message_time || targetChat.last_message_time,
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetChat.id);

      // Eliminar chat duplicado
      await supabase
        .from("whatsapp_chats")
        .delete()
        .eq("id", sourceChat.id);

      return NextResponse.json({ success: true, mergedTargetId: targetChat.id });
    }

    if (!clientPhone) {
      return NextResponse.json({ error: "Número de teléfono requerido" }, { status: 400 });
    }

    let result;
    if (action === "order_confirmed") {
      result = await dispatchOrderStatusNotification({
        orderId: orderNumber,
        clientName: clientName || "Cliente",
        clientPhone,
        newStatus: "pending",
        shippingType: body.shippingType || "puebla_local",
        pickupPoint: body.pickupPoint,
        total: total || 0,
        notes: body.notes,
      });
    } else if (action === "status_update") {
      result = await dispatchOrderStatusNotification({
        orderId: orderNumber,
        clientName: clientName || "Cliente",
        clientPhone,
        newStatus,
        shippingType: body.shippingType,
        pickupPoint: body.pickupPoint,
        total: total || 0,
        trackingNumber: body.trackingNumber,
        shippingCompany: body.shippingCompany,
        notes: body.notes,
        loyaltyStars: body.loyaltyStars,
        ticketImageUrl: body.ticketImageUrl,
      });
    } else if (action === "cart_recovery") {
      result = await notifyAbandonedCartRecovery(clientName || "Cliente", clientPhone, discountCode);
    } else {
      return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error en endpoint /api/whatsapp:", error);
    return NextResponse.json({ error: "Error procesando solicitud" }, { status: 500 });
  }
}
