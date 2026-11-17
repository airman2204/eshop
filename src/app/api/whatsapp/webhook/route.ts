import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { formatPhoneNumber } from "@/lib/whatsapp";
import { checkRateLimit } from "@/lib/security";
import { detectGroupPurchaseIntent, createProductReservation } from "@/lib/socialCommerce";
import { generateHumanReply, getActiveBotFlow, sendViaWhatsAppBridge } from "@/lib/botEngine";

/**
 * POST /api/whatsapp/webhook
 * Recibe mensajes entrantes desde el bridge (Baileys / Evolution API)
 * e inserta en Supabase Realtime para que Mario y su socio lo vean en vivo.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verificación de token secreto opcional para el bridge
    const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (webhookSecret) {
      const incomingSecret = req.headers.get("x-webhook-secret") || req.nextUrl.searchParams.get("secret");
      if (incomingSecret !== webhookSecret) {
        return NextResponse.json({ error: "No autorizado: Token de webhook inválido" }, { status: 401 });
      }
    }

    // 2. Rate limit preventivo (máx 120 eventos por minuto)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
    if (!checkRateLimit(`wa_webhook:${ip}`, 120, 60)) {
      return NextResponse.json({ error: "Rate limit excedido" }, { status: 429 });
    }

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

    // Evento B.1: Bienvenida automática cuando entra un nuevo miembro al grupo
    if (body.type === 'group_join' && body.groupJid) {
      const groupName = body.groupName ? ` a *${body.groupName}*` : "";
      const rawParticipant = String(body.participantJid || "").replace(/@.+/, "").replace(/\D/g, "");
      let clientName = "";

      if (rawParticipant) {
        const { data: knownChat } = await supabase
          .from("whatsapp_chats")
          .select("client_name")
          .or(`phone.ilike.%${rawParticipant.slice(-10)}%,notes.ilike.%"lid":"${rawParticipant}"%`)
          .limit(1)
          .maybeSingle();
        if (knownChat?.client_name && !/^\d+$/.test(knownChat.client_name)) {
          clientName = ` ${knownChat.client_name}`;
        }
      }

      const flow = await getActiveBotFlow();
      const welcomeNode = flow.nodes.find((n: any) => n.id === "welcome");
      const rawTemplate =
        welcomeNode?.data?.messageTemplate ||
        `¡Hola{{client_name}}! Qué gusto tenerte por aquí{{group_name}} 🦊✨\n\nAquí compartimos novedades y piezas especiales recién llegadas con envío incluido. Si ves algo que te encante, solo responde *"yo"* a la foto y con gusto te lo apartamos.`;

      const welcomeText = rawTemplate
        .replace(/\{\{client_name\}\}/g, clientName)
        .replace(/\{\{group_name\}\}/g, groupName);

      await sendViaWhatsAppBridge(String(body.groupJid), welcomeText);
      return NextResponse.json({ success: true, event: 'group_welcome_sent' });
    }

    // Evento C: Mensaje nuevo entrante
    // Soportar distintos formatos de payload comunes (Evolution API, Baileys HTTP Bridge, etc.)
    const rawPhone = body.phone || body.sender || body.from || body.data?.key?.remoteJid || "";
    const text = body.text || body.message || body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";
    const clientName = body.clientName || body.pushName || body.data?.pushName || "Cliente WhatsApp";

    // Evento C.0: Captura de Social Commerce en Grupos (@g.us)
    const isGroup = body.isGroup === true || String(rawPhone).endsWith("@g.us");
    if (isGroup && text) {
      const rawParticipant = body.participant || body.data?.key?.participant || "";
      const participantPhone = formatPhoneNumber(String(rawParticipant).replace(/@.+/, ""));
      const quotedText =
        body.quotedText ||
        body.data?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
        body.data?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage?.caption ||
        "";

      const { hasIntent, skuCandidate } = detectGroupPurchaseIntent(text, quotedText);
      if (hasIntent && skuCandidate && participantPhone) {
        const res = await createProductReservation(skuCandidate, participantPhone, 20);
        if (res.success && res.product) {
          const groupReplies = [
            `¡Tuyo, *${clientName}*! Ya te eché *${res.product.name}* a tu bolsita, ahorita te escribo por privado 🦊`,
            `¡Anotadísimo, *${clientName}*! Te mando mensajito en privado por *${res.product.name}* ✨`,
            `¡Listo *${clientName}*, ya te aparté *${res.product.name}*! Checa tu privado 🛍️`,
          ];
          const randomGroupReply = groupReplies[Math.floor(Math.random() * groupReplies.length)];
          await sendViaWhatsAppBridge(
            String(rawPhone),
            randomGroupReply,
            body.messageId || body.data?.key?.id
          );
          const hasRealName = clientName && !/cliente/i.test(clientName);
          const dmReply = await generateHumanReply({
            userMessage: `El cliente${hasRealName ? ` se llama ${clientName} y` : ""} acaba de apartar "${res.product.name}" en el grupo ($${res.product.price} MXN). ${hasRealName ? `Salúdalo por su nombre (${clientName}), NO le preguntes cómo se llama.` : "Pregúntale amablemente ¿con quién tengo el gusto?"} Dile qué padre que se animó, confírmale el apartado con su precio y menciona de forma fluida que puede pagar con tarjeta por Mercado Pago, SPEI o contra entrega en Puebla/Cholula.`,
            productName: res.product.name,
            sku: res.product.sku,
            price: res.product.price,
            nodeTemplate: `¡Qué padre${hasRealName ? `, ${clientName}` : ""}! Qué gusto que te animaste por *${res.product.name}* en $${res.product.price} MXN con envío incluido 🦊✨${hasRealName ? "" : " ¿Con quién tengo el gusto?"} Cuando gustes cerrar tu pedido puedes pagar con tarjeta por Mercado Pago, transferencia SPEI o contra entrega si estás en Puebla o Cholula.`,
          });
          await sendViaWhatsAppBridge(String(rawParticipant || participantPhone), dmReply);
          return NextResponse.json({ success: true, event: "group_reservation_created", sku: res.product.sku });
        } else if (res.reason === "out_of_stock") {
          await sendViaWhatsAppBridge(
            String(rawPhone),
            `¡Ups, ${clientName}! Ya se apartó la última pieza de *${res.product?.name || skuCandidate}*. Si se libera en 20 min te avisamos 🦊`,
            body.messageId || body.data?.key?.id
          );
          return NextResponse.json({ success: true, event: "group_out_of_stock" });
        }
      }
      return NextResponse.json({
        received: true,
        event: "group_ignored",
        hasIntent,
        skuCandidate,
        participantPhone,
      });
    }

    let cleanPhone = formatPhoneNumber(String(rawPhone).replace(/@.+/, ""));

    // Evento C.1: Si el cliente responde en privado (DM), Sofía responde con memoria conversacional
    if (cleanPhone && text) {
      // Cargar últimos 8 mensajes del historial para que Sofía tenga contexto real y no repita respuestas
      let chatHistory: { sender: string; text: string }[] = [];
      const { data: chatForHist } = await supabase
        .from("whatsapp_chats")
        .select("id")
        .or(`phone.eq.${cleanPhone},phone.ilike.%${cleanPhone.slice(-10)}%`)
        .limit(1)
        .maybeSingle();

      if (chatForHist?.id) {
        const { data: msgs } = await supabase
          .from("whatsapp_messages")
          .select("sender, text")
          .eq("chat_id", chatForHist.id)
          .order("created_at", { ascending: false })
          .limit(8);
        if (Array.isArray(msgs)) {
          chatHistory = msgs.reverse().map((m: any) => ({ sender: m.sender, text: m.text }));
        }
      }

      let { data: activeRes } = await (supabase as any)
        .from("inventory_reservations")
        .select("id, product_id, sku")
        .or(`phone.eq.${cleanPhone},phone.ilike.%${cleanPhone.slice(-10)}%`)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Si no encontró por teléfono, buscar si el chat tiene un LID asociado en whatsapp_chats
      if (!activeRes) {
        const { data: chatForLid } = await supabase
          .from("whatsapp_chats")
          .select("notes")
          .or(`phone.eq.${cleanPhone},phone.ilike.%${cleanPhone.slice(-10)}%`)
          .limit(1)
          .maybeSingle();
        let lidVal = "";
        try {
          const parsedNotes = typeof chatForLid?.notes === "string" ? JSON.parse(chatForLid.notes) : chatForLid?.notes;
          lidVal = parsedNotes?.lid ? String(parsedNotes.lid) : "";
        } catch {}
        if (lidVal) {
          const { data: resByLid } = await (supabase as any)
            .from("inventory_reservations")
            .select("id, product_id, sku")
            .eq("phone", lidVal)
            .eq("status", "active")
            .gt("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          activeRes = resByLid;
        }
      }

      if (activeRes) {
        // Si el cliente mandó foto/comprobante SPEI en DM
        const incomingMedia = body.mediaUrl || body.imageUrl || "";
        if (incomingMedia) {
          await (supabase as any)
            .from("inventory_reservations")
            .update({ spei_receipt_url: incomingMedia, payment_method: "spei" })
            .eq("id", activeRes.id);

          await sendViaWhatsAppBridge(
            String(rawPhone || cleanPhone),
            "¡Recibido! Ya pasé tu comprobante a validación y en un momento te confirmo tu ticket 🦊✨"
          );
          return NextResponse.json({ success: true, event: "spei_receipt_received" });
        }

        const cancelRegex = /\b(mejor\s+no|no\s+lo\s+quiero|ya\s+no|cancela|cancelar|cancelalo|cancélalo|no\s+gracias)\b/i;
        if (cancelRegex.test(text)) {
          await (supabase as any)
            .from("inventory_reservations")
            .update({ status: "cancelled" })
            .eq("id", activeRes.id);

          await sendViaWhatsAppBridge(
            String(rawPhone || cleanPhone),
            "¡Sin problema! Ya lo liberamos por si alguien más lo aprovecha. Si te vuelves a animar, solo responde a la foto en el grupo 🦊✨"
          );
          return NextResponse.json({ success: true, event: "reservation_cancelled" });
        }

        // Responder cualquier duda o conversación libre en DM con Sofía (Skill oficial)
        const { data: prod } = await (supabase as any)
          .from("products")
          .select("*")
          .eq("id", activeRes.product_id)
          .maybeSingle();

        const prodName = prod?.title || prod?.name || activeRes.sku;
        const prodPrice = Number(prod?.public_price ?? prod?.publicPrice ?? prod?.price ?? 0);

        // Si el cliente pide pagar con Mercado Pago / tarjeta / link, generar link real al instante
        let paymentLink = "";
        if (/\b(mercado\s*pago|mercadopago|tarjeta|link)\b/i.test(text) && process.env.MERCADOPAGO_ACCESS_TOKEN && prodPrice > 0) {
          try {
            const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
              },
              body: JSON.stringify({
                items: [{ title: prodName, quantity: 1, unit_price: prodPrice, currency_id: "MXN" }],
                external_reference: activeRes.id,
                back_urls: {
                  success: "https://foxdrop.mx/tienda?pago=exitoso",
                  failure: "https://foxdrop.mx/tienda?pago=fallido",
                  pending: "https://foxdrop.mx/tienda?pago=pendiente",
                },
                auto_return: "approved",
              }),
            });
            const mpJson = await mpRes.json();
            if (mpJson?.init_point) paymentLink = mpJson.init_point;
          } catch (mpErr) {
            console.error("[Webhook] Error generando link MP:", mpErr);
          }
        }

        const dmReply = await generateHumanReply({
          userMessage: text,
          history: chatHistory,
          productName: prodName,
          sku: activeRes.sku,
          price: prodPrice,
          paymentLink: paymentLink || undefined,
          nodeTemplate: paymentLink
            ? `¡Claro que sí! Aquí tienes tu link seguro de Mercado Pago para *${prodName}* ($${prodPrice} MXN): ${paymentLink} 🦊✨ En cuanto quede listo me avisas.`
            : "",
        });

        if (chatForHist?.id) {
          await (supabase as any).from("whatsapp_messages").insert([
            { chat_id: chatForHist.id, sender: "client", text, status: "read" },
            { chat_id: chatForHist.id, sender: "admin", text: dmReply, status: "sent" },
          ]);
        }

        await sendViaWhatsAppBridge(String(rawPhone || cleanPhone), dmReply);
        return NextResponse.json({ success: true, event: "dm_sofia_replied" });
      }

      // Si no tiene apartado activo pero pregunta en DM (ej. "¿es seguro?", "¿son originales?"), Sofía también responde
      // Si no tiene apartado activo pero pregunta en DM, pasarle únicamente stock de Bath & Body Works
      const { data: liveStockRaw } = await (supabase as any)
        .from("products")
        .select("title, public_price, stock, image_url")
        .gt("stock", 0)
        .ilike("title", "%Bath%Body%")
        .limit(35);
      const liveStock = liveStockRaw || [];

      const catalogContext = Array.isArray(liveStock)
        ? liveStock
            .map((p: any) => `- ${p.title}: $${Number(p.public_price || 0)} MXN (Stock: ${p.stock})`)
            .join("\n")
        : "";

      // Si el cliente pide fotos o ver opciones de algo en específico, buscar foto real (normalizando plurales)
      let matchedPhotoUrl = "";
      if (/\b(foto|fotos|imagen|imágenes|muéstrame|muestrame|ver|tienes|opciones|muestras)\b/i.test(text) && Array.isArray(liveStock)) {
        const words = text
          .toLowerCase()
          .replace(/\bgeles\b/g, "gel")
          .replace(/\bcremas\b/g, "crema")
          .replace(/\bprotectores\b/g, "protector")
          .replace(/\bcarros\b/g, "auto")
          .split(/\s+/)
          .filter((w: string) => w.length >= 3);
        const matched = liveStock.find((p: any) =>
          words.some((w: string) => String(p.title || "").toLowerCase().includes(w))
        );
        if (matched?.image_url) matchedPhotoUrl = matched.image_url;
      }

      const generalReply = await generateHumanReply({
        userMessage: text,
        history: chatHistory,
        catalogContext,
        nodeTemplate: "",
      });

      // Guardar ambos mensajes en whatsapp_messages para que la memoria funcione al segundo
      if (chatForHist?.id) {
        await (supabase as any).from("whatsapp_messages").insert([
          { chat_id: chatForHist.id, sender: "client", text, status: "read" },
          { chat_id: chatForHist.id, sender: "admin", text: generalReply, status: "sent" },
        ]);
      }

      await sendViaWhatsAppBridge(String(rawPhone || cleanPhone), generalReply, undefined, undefined, matchedPhotoUrl || undefined);
      return NextResponse.json({
        success: true,
        event: "dm_sofia_general_replied",
        reply: generalReply,
        hasGeminiKey: !!(process.env.GEMINI_API_KEY || "").trim(),
      });
    }

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
        } else {
          // 3. Heurística de Vinculación Automática por Interacción Reciente:
          // Si el admin acaba de enviar un mensaje o ticket en las últimas 3 horas a un cliente
          // que aún no tiene LID registrado
          const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
          const { data: recentChats } = await supabase
            .from("whatsapp_chats")
            .select("id, phone, unread_count, client_name, notes, last_message_time")
            .not("phone", "ilike", "_system_%")
            .not("notes", "ilike", "%\"lid\"%")
            .gte("last_message_time", threeHoursAgo)
            .order("last_message_time", { ascending: false })
            .limit(3);

          if (recentChats && recentChats.length > 0) {
            const candidate = recentChats[0];
            chat = candidate;
            cleanPhone = candidate.phone;

            let updatedNotes: any = {};
            try {
              updatedNotes = typeof candidate.notes === "string" ? JSON.parse(candidate.notes) : (candidate.notes || {});
            } catch {}
            updatedNotes.lid = incomingLid;
            updatedNotes.alias = clientName;

            await (supabase as any)
              .from("whatsapp_chats")
              .update({ notes: JSON.stringify(updatedNotes) })
              .eq("id", candidate.id);
          }
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
      // Incrementar contador de no leídos y actualizar LID o avatar si vino uno nuevo (preservando notes existentes)
      const updateData: any = {
        client_name: clientName,
        last_message: text,
        last_message_time: new Date().toISOString(),
        unread_count: (chat?.unread_count || 0) + 1,
        updated_at: new Date().toISOString(),
      };
      if (incomingLid) {
        let currentNotes: any = {};
        try {
          currentNotes = typeof chat?.notes === "string" ? JSON.parse(chat.notes) : (chat?.notes || {});
        } catch {}
        currentNotes.lid = incomingLid;
        updateData.notes = JSON.stringify(currentNotes);
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

      // SI EL USUARIO PUSO EL CHAT EN MODO 'manual', SE RESPETA ESTRICTAMENTE
      // El bot NO responderá a menos que el admin lo vuelva a activar explícitamente a 'agent'
      const isManual = chatNotes.agentMode === "manual" || chatNotes.agentMode === false;
      const isAgentActive = !isManual;

      // Si el agente está activo y no es un sticker
      if (isAgentActive && !text.startsWith("[Sticker")) {
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
