import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { formatPhoneNumber } from "@/lib/whatsapp";

/**
 * POST /api/whatsapp/webhook
 * Recibe mensajes entrantes desde el bridge (Baileys / Evolution API)
 * e inserta en Supabase Realtime para que Mario y su socio lo vean en vivo.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Soportar distintos formatos de payload comunes (Evolution API, Baileys HTTP Bridge, etc.)
    const rawPhone = body.phone || body.sender || body.from || body.data?.key?.remoteJid || "";
    let cleanPhone = formatPhoneNumber(String(rawPhone).replace(/@.+/, ""));
    const text = body.text || body.message || body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";
    const clientName = body.clientName || body.pushName || body.data?.pushName || "Cliente WhatsApp";

    if (!cleanPhone || !text) {
      return NextResponse.json({ received: true, note: "Mensaje vacío o sin remitente ignorado" });
    }

    const supabase = createServerClient();

    // 1. Buscar o crear el chat: unificar si ya existe por número exacto o por últimos 10 dígitos
    let { data: chat } = await supabase
      .from("whatsapp_chats")
      .select("id, phone, unread_count")
      .eq("phone", cleanPhone)
      .maybeSingle();

    // Si cleanPhone vino como un LID largo (ej. 64...) buscar si pertenece a un chat existente
    if (!chat && cleanPhone.length > 12 && !cleanPhone.startsWith("52")) {
      const { data: matchedChat } = await supabase
        .from("whatsapp_chats")
        .select("id, phone, unread_count")
        .order("last_message_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Si sólo hay un chat activo de prueba o el nombre coincide, asociarlo
      if (matchedChat) {
        chat = matchedChat;
        cleanPhone = matchedChat.phone;
      }
    }

    const incomingLid = body.lid || (String(rawPhone).includes("@lid") ? String(rawPhone).replace(/@.+/, "") : undefined) || (cleanPhone.length > 12 && !cleanPhone.startsWith("52") ? cleanPhone : undefined);

    let chatId = chat?.id;

    if (!chatId) {
      const { data: newChat, error: newChatErr } = await supabase
        .from("whatsapp_chats")
        .insert({
          phone: cleanPhone,
          client_name: clientName,
          last_message: text,
          last_message_time: new Date().toISOString(),
          unread_count: 1,
          status: "active",
          ...(incomingLid ? { notes: JSON.stringify({ lid: incomingLid }) } : {}),
        })
        .select("id")
        .single();

      if (newChatErr) throw newChatErr;
      chatId = newChat.id;
    } else {
      // Incrementar contador de no leídos y actualizar LID si vino uno nuevo
      const updateData: any = {
        client_name: clientName,
        last_message: text,
        last_message_time: new Date().toISOString(),
        unread_count: (chat?.unread_count || 0) + 1,
        updated_at: new Date().toISOString(),
      };
      if (incomingLid) {
        updateData.notes = JSON.stringify({ lid: incomingLid });
      }

      await supabase
        .from("whatsapp_chats")
        .update(updateData)
        .eq("id", chatId);
    }

    // 2. Insertar mensaje en la conversación
    const { error: msgErr } = await supabase
      .from("whatsapp_messages")
      .insert({
        chat_id: chatId,
        phone: cleanPhone,
        sender: "client",
        sender_name: clientName,
        text: text,
        status: "delivered",
      });

    if (msgErr) throw msgErr;

    return NextResponse.json({ success: true, chatId });
  } catch (error: any) {
    console.error("Error en webhook de WhatsApp:", error);
    return NextResponse.json({ error: error.message || "Error procesando webhook" }, { status: 500 });
  }
}
