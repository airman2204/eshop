import { createServerClient } from "@/lib/supabase/server";
import { formatPhoneNumber } from "@/lib/whatsapp";

export interface OrderNotificationParams {
  orderId: string;
  clientName: string;
  clientPhone: string;
  newStatus: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  shippingType?: "puebla_local" | "agreed_pickup" | "national_shipping" | "pos_in_store" | string;
  pickupPoint?: string;
  total?: number;
  trackingNumber?: string;
  shippingCompany?: string;
  itemsSummary?: string;
  notes?: string;
  loyaltyStars?: number;
}

/**
 * Despacha un mensaje de WhatsApp transaccional al cliente a través del bridge oficial
 * e inserta en la base de datos para que aparezca en el chat de administración.
 */
async function sendWhatsAppNotification(params: {
  phone: string;
  clientName: string;
  text: string;
  stickerUrl?: string;
}) {
  try {
    const supabase = createServerClient() as any;
    const cleanPhone = formatPhoneNumber(params.phone);
    const bridgeUrl = process.env.WHATSAPP_BRIDGE_URL || "https://foxdrop-whatsapp-bridge.onrender.com";
    const bridgeApiKey = process.env.WHATSAPP_BRIDGE_API_KEY || "foxdrop_secret_2026";

    // 1. Buscar o crear el chat correspondiente en Supabase
    let { data: chat } = await supabase
      .from("whatsapp_chats")
      .select("id, notes")
      .eq("phone", cleanPhone)
      .maybeSingle();

    let chatId = chat?.id;
    let targetToSend = cleanPhone;

    if (!chatId) {
      const { data: newChat } = await supabase
        .from("whatsapp_chats")
        .insert({
          phone: cleanPhone,
          client_name: params.clientName,
          last_message: params.text,
          last_message_time: new Date().toISOString(),
          unread_count: 0,
          status: "active",
        })
        .select("id")
        .single();
      chatId = newChat?.id;
    } else {
      if (chat?.notes) {
        try {
          const parsed = typeof chat.notes === "string" ? JSON.parse(chat.notes) : chat.notes;
          if (parsed?.lid) {
            targetToSend = `${parsed.lid}@lid`;
          }
        } catch {}
      }
    }

    // Si no es LID, asegurar formato para México
    if (!targetToSend.includes("@lid")) {
      const digits = cleanPhone.replace(/\D/g, "");
      if (digits.startsWith("52") && digits.length === 12 && !digits.startsWith("521")) {
        targetToSend = `521${digits.slice(2)}`;
      }
    }

    // 2. Registrar mensaje de texto en Supabase
    if (chatId) {
      await supabase.from("whatsapp_messages").insert({
        chat_id: chatId,
        phone: cleanPhone,
        sender: "admin",
        sender_name: "FoxDrop (Notificación)",
        text: params.text,
        status: "delivered",
      });

      await supabase
        .from("whatsapp_chats")
        .update({
          last_message: params.text,
          last_message_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", chatId);
    }

    // 3. Despachar texto por el bridge
    await fetch(`${bridgeUrl}/message/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(bridgeApiKey ? { apikey: bridgeApiKey, Authorization: `Bearer ${bridgeApiKey}` } : {}),
      },
      body: JSON.stringify({
        number: targetToSend,
        text: params.text,
      }),
    });

    // 4. Si incluye Sticker oficial, registrarlo y despacharlo como sticker
    if (params.stickerUrl) {
      const stickerTitle = params.stickerUrl.split("/").pop()?.replace(".webp", "") || "Sticker FoxDrop";
      
      if (chatId) {
        await supabase.from("whatsapp_messages").insert({
          chat_id: chatId,
          phone: cleanPhone,
          sender: "admin",
          sender_name: "FoxDrop (Notificación)",
          text: `[Sticker: ${stickerTitle}]`,
          media_type: "image",
          media_url: params.stickerUrl,
          status: "delivered",
        });
      }

      await fetch(`${bridgeUrl}/message/sendText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(bridgeApiKey ? { apikey: bridgeApiKey, Authorization: `Bearer ${bridgeApiKey}` } : {}),
        },
        body: JSON.stringify({
          number: targetToSend,
          type: "sticker",
          imageUrl: params.stickerUrl,
          text: `[Sticker: ${stickerTitle}]`,
        }),
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error despachando notificación de pedido por WhatsApp:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Evalúa el tipo de compra/entrega y la etapa para disparar automáticamente el mensaje y sticker adecuados.
 */
export async function dispatchOrderStatusNotification(params: OrderNotificationParams) {
  const {
    orderId,
    clientName,
    clientPhone,
    newStatus,
    shippingType = "puebla_local",
    pickupPoint,
    total,
    trackingNumber,
    shippingCompany,
    notes,
    loyaltyStars,
  } = params;

  if (!clientPhone) return { success: false, error: "Teléfono no proporcionado" };

  const baseUrl = "https://foxdrop.mx";
  const firstName = clientName.split(" ")[0].trim() || "Cliente";
  const totalFormatted = total ? `$${Number(total).toLocaleString("es-MX")} MXN` : "";
  const starsCount = loyaltyStars || (total ? Math.floor(Number(total) / 10) : 0);

  let messageText = "";
  let stickerUrl: string | undefined = undefined;

  // =========================================================================
  // FLUJO A: VENTA PRESENCIAL (POS / MOSTRADOR / EVENTO)
  // =========================================================================
  if (shippingType === "pos_in_store" || shippingType === "in_store") {
    if (newStatus === "processing" || newStatus === "delivered") {
      messageText = `🦊 ¡Muchas gracias por tu compra en tienda, *${firstName}*!\n\n` +
        `🧾 *Folio de Venta:* #${orderId}\n` +
        (totalFormatted ? `💵 *Total Liquidado:* ${totalFormatted}\n` : "") +
        (starsCount > 0 ? `⭐ *Estrellas acumuladas en Club FoxDrop:* +${starsCount} estrellas\n\n` : "\n") +
        `¡Fue un placer atenderte hoy! Si necesitas factura o asistencia adicional, sólo responde a este mensaje.`;
      
      stickerUrl = `${baseUrl}/stickers/sticker-gracias-compra.webp`;
    }
  }

  // =========================================================================
  // FLUJO B: COMPRA EN LÍNEA CON CONTRA-ENTREGA EN PUEBLA (O PUNTO ACORDADO)
  // =========================================================================
  else if (shippingType === "puebla_local" || shippingType === "agreed_pickup") {
    const punto = pickupPoint || "Punto de entrega acordado en Puebla";

    switch (newStatus) {
      case "pending":
        messageText = `🦊 ¡Hola *${firstName}*! Recibimos tu pedido *#${orderId}* en FoxDrop Puebla.\n\n` +
          (totalFormatted ? `💵 *Total a liquidar contra-entrega:* ${totalFormatted}\n` : "") +
          `📍 *Punto/Zona acordada:* ${punto}\n\n` +
          `Estamos coordinando el horario ideal para la entrega. Te notificaremos en cuanto el paquete entre a empaque.`;
        break;

      case "processing":
        messageText = `🦊 ¡Tu pedido *#${orderId}* está en preparación, *${firstName}*!\n\n` +
          `Nuestro equipo en Puebla está empaquetando y revisando cuidadosamente tus productos para garantizar que todo llegue impecable.\n` +
          `Te confirmaremos en cuanto el repartidor salga en ruta.`;
        stickerUrl = `${baseUrl}/stickers/sticker-pago-caja.webp`;
        break;

      case "shipped":
        messageText = `🚚 ¡*${firstName}*, tu pedido *#${orderId}* va en camino!\n\n` +
          `El repartidor se encuentra en ruta hacia: *${punto}*.\n` +
          (totalFormatted ? `💵 *Recuerda tener preparado tu pago de:* ${totalFormatted} (efectivo o transferencia al recibir).\n\n` : "\n") +
          `Si requieres afinar algún detalle de llegada, por favor responde a este chat.`;
        stickerUrl = `${baseUrl}/stickers/sticker-pedido-camino-1.webp`;
        break;

      case "delivered":
        messageText = `🎉 ¡Pedido *#${orderId}* entregado con éxito, *${firstName}*!\n\n` +
          (starsCount > 0 ? `⭐ *Has acumulado:* +${starsCount} estrellas en tu cuenta FoxDrop.\n` : "") +
          `Esperamos que disfrutes mucho tus artículos. ¡Gracias por confiar en FoxDrop Puebla!\n\n` +
          `¿Todo llegó excelente? Nos encantaría que nos compartas tu opinión. 🦊`;
        stickerUrl = `${baseUrl}/stickers/sticker-gracias-compra.webp`;
        break;

      case "cancelled":
        messageText = `🦊 Hola *${firstName}*, te confirmamos que el pedido *#${orderId}* ha sido cancelado.` +
          (notes ? `\nMotivo: ${notes}` : "") +
          `\nSi consideras que esto fue un error o deseas reactivarlo, avísanos directamente por este medio.`;
        break;
    }
  }

  // =========================================================================
  // FLUJO C: COMPRA EN LÍNEA CON PAQUETERÍA NACIONAL
  // =========================================================================
  else if (shippingType === "national_shipping") {
    const courier = shippingCompany || "Paquetexpress / DHL / Estafeta";

    switch (newStatus) {
      case "pending":
        messageText = `🦊 ¡Hola *${firstName}*! Registramos tu pedido *#${orderId}* con envío nacional.\n\n` +
          (totalFormatted ? `💵 *Total:* ${totalFormatted}\n` : "") +
          `Estamos validando el pago para iniciar el proceso de preparación y despacho de tu paquete.`;
        break;

      case "processing":
        messageText = `🦊 ¡Pago confirmado y pedido en almacén, *${firstName}*!\n\n` +
          `Tu pedido *#${orderId}* está siendo protegido y embalado en nuestro almacén central para su entrega a la paquetería.\n` +
          `En breve te proporcionaremos tu número de guía y enlace de rastreo.`;
        stickerUrl = `${baseUrl}/stickers/sticker-pago-recibido.webp`;
        break;

      case "shipped":
        messageText = `📦 ¡*${firstName}*, tu pedido *#${orderId}* ha sido enviado!\n\n` +
          `🚚 *Empresa de Envíos:* ${courier}\n` +
          (trackingNumber ? `📍 *Número de Guía:* \`${trackingNumber}\`\n` : "") +
          `🔗 Puedes rastrear el avance de tu paquete directamente en el portal de la paquetería.\n\n` +
          `¡Tu paquete ya va en viaje hacia tu destino!`;
        stickerUrl = `${baseUrl}/stickers/sticker-pedido-enviado.webp`;
        break;

      case "delivered":
        messageText = `🏠 ¡Tu paquete *#${orderId}* ha sido entregado, *${firstName}*!\n\n` +
          `La paquetería reporta la entrega exitosa de tu envío. Deseamos que disfrutes al máximo tus productos FoxDrop.\n` +
          `¡Etiquétanos en redes sociales con tu unboxing si te encantó! 🦊`;
        stickerUrl = `${baseUrl}/stickers/sticker-gracias-compra.webp`;
        break;

      case "cancelled":
        messageText = `🦊 Hola *${firstName}*, tu pedido *#${orderId}* ha sido cancelado.` +
          (notes ? `\nMotivo: ${notes}` : "") +
          `\nSi tienes saldo a favor o alguna pregunta sobre tu reembolso, estamos listos para atenderte por aquí.`;
        break;
    }
  }

  // Si no se armó ningún mensaje para la combinación, retornar
  if (!messageText) {
    return { success: false, reason: "No hay plantilla configurada para este estado y tipo" };
  }

  return sendWhatsAppNotification({
    phone: clientPhone,
    clientName,
    text: messageText,
    stickerUrl,
  });
}
