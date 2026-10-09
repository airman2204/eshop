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

    const supabase = createServerClient();

    // Evento A: Actualización de estado de mensaje (1 paloma, 2 palomas, leídos)
    if (body.type === 'receipt' && body.phone && body.status) {
      const rawDigits = String(body.phone).replace(/\D/g, '');
      const cleanPhone = formatPhoneNumber(String(body.phone).replace(/@.+/, ''));
      const status = body.status; // 'delivered' o 'read'
      
      // Buscar chat correspondiente por teléfono, últimos 10 dígitos o LID en notes
      let { data: chatRow } = await supabase
        .from('whatsapp_chats')
        .select('id')
        .or(`phone.eq.${cleanPhone},phone.ilike.%${rawDigits.slice(-10)}%,notes.ilike.%"lid":"${rawDigits}"%`)
        .maybeSingle();

      if (chatRow?.id) {
        // Actualizar los mensajes enviados por el admin a este estado
        await (supabase as any)
          .from('whatsapp_messages')
          .update({ status: status })
          .eq('chat_id', chatRow.id)
          .eq('sender', 'admin')
          .neq('status', 'read'); // Si ya estaba read, no degradarlo a delivered
      }
      return NextResponse.json({ success: true, event: 'receipt_updated' });
    }

    // Evento B: El contacto está escribiendo o en línea (presence)
    if (body.type === 'presence' && body.phone) {
      const rawDigits = String(body.phone).replace(/\D/g, '');
      const cleanPhone = formatPhoneNumber(String(body.phone).replace(/@.+/, ''));
      let { data: chatRow } = await supabase
        .from('whatsapp_chats')
        .select('id, notes')
        .or(`phone.eq.${cleanPhone},phone.ilike.%${rawDigits.slice(-10)}%,notes.ilike.%"lid":"${rawDigits}"%`)
        .maybeSingle();

      if (chatRow?.id) {
        let existingNotes: any = {};
        try {
          existingNotes = typeof chatRow.notes === 'string' ? JSON.parse(chatRow.notes) : (chatRow.notes || {});
        } catch {}

        existingNotes.isTyping = !!body.isTyping;
        existingNotes.typingUpdatedAt = new Date().toISOString();

        await (supabase as any)
          .from('whatsapp_chats')
          .update({
            notes: JSON.stringify(existingNotes),
            updated_at: new Date().toISOString()
          })
          .eq('id', chatRow.id);
      }
      return NextResponse.json({ success: true, event: 'presence_updated' });
    }

    // Evento C: Mensaje nuevo entrante
    // Soportar distintos formatos de payload comunes (Evolution API, Baileys HTTP Bridge, etc.)
    const rawPhone = body.phone || body.sender || body.from || body.data?.key?.remoteJid || "";
    let cleanPhone = formatPhoneNumber(String(rawPhone).replace(/@.+/, ""));
    const text = body.text || body.message || body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";
    const clientName = body.clientName || body.pushName || body.data?.pushName || "Cliente WhatsApp";

    if (!cleanPhone || !text) {
      return NextResponse.json({ received: true, note: "Mensaje vacío o sin remitente ignorado" });
    }

    // 1. Buscar o crear el chat: coincidencia por teléfono exacto, por últimos 10 dígitos, o por LID guardado
    let { data: chat } = await supabase
      .from("whatsapp_chats")
      .select("id, phone, unread_count, notes")
      .eq("phone", cleanPhone)
      .maybeSingle();

    const incomingLid = body.lid || (String(rawPhone).includes("@lid") ? String(rawPhone).replace(/@.+/, "") : undefined) || (cleanPhone.length > 12 && !cleanPhone.startsWith("52") ? cleanPhone : undefined);

    // Si no encontró por teléfono y tenemos un LID, buscar si algún chat tiene este LID en notes o coincide el cliente
    if (!chat && incomingLid) {
      const { data: matchedLidChat } = await supabase
        .from("whatsapp_chats")
        .select("id, phone, unread_count, notes")
        .ilike("notes", `%"lid":"${incomingLid}"%`)
        .maybeSingle();

      if (matchedLidChat) {
        chat = matchedLidChat;
        cleanPhone = matchedLidChat.phone;
      } else if (cleanPhone.length > 12 && !cleanPhone.startsWith("52")) {
        // Es un LID sin número real asociado aún: buscar si hay un chat con el mismo nombre o nombre similar (ej: "Nydia" y "Nydia Villarce")
        const firstName = clientName.split(' ')[0].trim();
        const { data: nameChat } = await supabase
          .from("whatsapp_chats")
          .select("id, phone, unread_count, notes")
          .or(`client_name.ilike.%${firstName}%,client_name.ilike.%${clientName}%`)
          .neq("phone", cleanPhone)
          .neq("phone", "_system_baileys_auth")
          .order("last_message_time", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (nameChat) {
          chat = nameChat;
          cleanPhone = nameChat.phone;
        }
      }
    }
    const incomingAvatarUrl = body.avatarUrl || body.avatar_url || undefined;

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
          ...(incomingAvatarUrl ? { avatar_url: incomingAvatarUrl } : {}),
          ...(incomingLid ? { notes: JSON.stringify({ lid: incomingLid }) } : {}),
        })
        .select("id")
        .single();

      if (newChatErr) throw newChatErr;
      chatId = newChat.id;
    } else {
      // Incrementar contador de no leídos y actualizar LID o avatar si vino uno nuevo
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
      if (incomingAvatarUrl) {
        updateData.avatar_url = incomingAvatarUrl;
      }

      await supabase
        .from("whatsapp_chats")
        .update(updateData)
        .eq("id", chatId);
    }

    // 2. Insertar mensaje en la conversación
    // La BD tiene CHECK (media_type IN ('image', 'document', 'audio')).
    const incomingMediaType = body.mediaType === 'sticker' ? 'image' : (body.mediaType || undefined);
    const incomingMediaUrl = body.mediaUrl || undefined;

    const { error: msgErr } = await supabase
      .from("whatsapp_messages")
      .insert({
        chat_id: chatId,
        phone: cleanPhone,
        sender: "client",
        sender_name: clientName,
        text: text,
        status: "delivered",
        media_type: incomingMediaType,
        media_url: incomingMediaUrl,
      });

    if (msgErr) throw msgErr;

    // 3. AGENTE HÍBRIDO DE WHATSAPP:
    // Si el chat tiene activado el modo 'agent' (o por defecto si no está pausado por un humano en los últimos 30 min)
    try {
      let chatNotes: any = {};
      try {
        chatNotes = typeof chat?.notes === "string" ? JSON.parse(chat?.notes) : (chat?.notes || {});
      } catch {}

      const agentMode = chatNotes.agentMode !== false && chatNotes.agentMode !== "manual";
      const manualUntil = chatNotes.manualUntil ? new Date(chatNotes.manualUntil).getTime() : 0;
      const isManualPaused = Date.now() < manualUntil;

      // Si el agente está activo y no hay pausa manual activa
      if (agentMode && !isManualPaused && !text.startsWith("[Sticker")) {
        // Ejecutar en background para no demorar la respuesta HTTP al webhook
        (async () => {
          try {
            const { generateAgentWhatsAppReply } = await import("@/lib/whatsappAgent");
            const bridgeUrl = process.env.WHATSAPP_BRIDGE_URL || "https://foxdrop-whatsapp-bridge.onrender.com";
            const bridgeApiKey = process.env.WHATSAPP_BRIDGE_API_KEY || "foxdrop_secret_2026";

            // Simular presencia "composing" (escribiendo) en WhatsApp para realismo
            try {
              let targetForPresence = cleanPhone;
              if (chatNotes.lid) targetForPresence = `${chatNotes.lid}@lid`;
              await fetch(`${bridgeUrl}/chat/subscribePresence`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: targetForPresence }),
              }).catch(() => {});
            } catch {}

            // Pequeña espera de 1.5s para simular lectura y digitación humana
            await new Promise((r) => setTimeout(r, 1500));

            const agentRes = await generateAgentWhatsAppReply({
              phone: cleanPhone,
              clientName,
              incomingMessage: text,
            });

            if (agentRes?.reply) {
              // 1. Guardar mensaje del agente en Supabase
              await (supabase as any).from("whatsapp_messages").insert({
                chat_id: chatId,
                phone: cleanPhone,
                sender: "admin",
                sender_name: "FoxBot 🦊 (Agente)",
                text: agentRes.reply,
                status: "delivered",
              });

              await (supabase as any).from("whatsapp_chats").update({
                last_message: agentRes.reply,
                last_message_time: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }).eq("id", chatId);

              // 2. Enviar por el bridge
              let targetToSend = cleanPhone;
              if (chatNotes.lid) targetToSend = `${chatNotes.lid}@lid`;
              if (!targetToSend.includes("@lid")) {
                const digits = cleanPhone.replace(/\D/g, "");
                if (digits.startsWith("52") && digits.length === 12 && !digits.startsWith("521")) {
                  targetToSend = `521${digits.slice(2)}`;
                }
              }

              await fetch(`${bridgeUrl}/message/sendText`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(bridgeApiKey ? { apikey: bridgeApiKey, Authorization: `Bearer ${bridgeApiKey}` } : {}),
                },
                body: JSON.stringify({
                  number: targetToSend,
                  text: agentRes.reply,
                }),
              });

              // 3. Si sugirió sticker, enviarlo
              if (agentRes.suggestedSticker) {
                await fetch(`${bridgeUrl}/message/sendText`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(bridgeApiKey ? { apikey: bridgeApiKey, Authorization: `Bearer ${bridgeApiKey}` } : {}),
                  },
                  body: JSON.stringify({
                    number: targetToSend,
                    type: "sticker",
                    imageUrl: agentRes.suggestedSticker,
                  }),
                });
              }
            }
          } catch (agentErr) {
            console.error("Error en ejecución del Agente de WhatsApp:", agentErr);
          }
        })();
      }
    } catch (agentCheckErr) {
      console.warn("Aviso en verificación de Agente:", agentCheckErr);
    }

    return NextResponse.json({ success: true, chatId });
  } catch (error: any) {
    console.error("Error en webhook de WhatsApp:", error);
    return NextResponse.json({ error: error.message || "Error procesando webhook" }, { status: 500 });
  }
}
