/**
 * SERVICIO META WHATSAPP CLOUD API
 * Envío de mensajes transaccionales automatizados (pedidos y carritos)
 */

interface SendWhatsAppTemplateParams {
  toPhone: string;
  templateName: string;
  languageCode?: string;
  bodyParameters?: string[];
}

/**
 * Normaliza el número de teléfono mexicano para WhatsApp (código de país 52 + 10 dígitos)
 */
export function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Si empieza con 521 y tiene 13 dígitos, convertir al formato nativo 52 + 10 dígitos (12 dígitos)
  if (digits.startsWith("521") && digits.length === 13) {
    return `52${digits.slice(3)}`;
  }
  // Si es número mexicano de 10 dígitos, anteponer 52
  if (digits.length === 10) {
    return `52${digits}`;
  }
  return digits;
}

/**
 * Envía un mensaje mediante la Cloud API de WhatsApp de Meta
 */
export async function sendWhatsAppMessage(toPhone: string, text: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  // Si no están configuradas las credenciales de Meta en producción, hacemos log informativo
  if (!token || token === "TU_TOKEN_AQUI" || !phoneId || phoneId === "TU_PHONE_NUMBER_ID") {
    console.info(`[WhatsApp Simulado] Para: ${toPhone} | Mensaje: ${text}`);
    return { success: true, simulated: true };
  }

  const formattedPhone = formatPhoneNumber(toPhone);

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: { body: text },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Error en WhatsApp Cloud API:", data);
      return { success: false, error: data };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Fallo de red al conectar con WhatsApp API:", error);
    return { success: false, error };
  }
}

/**
 * Plantilla de confirmación de pedido recibido
 */
export async function notifyOrderConfirmed(orderNumber: string, clientName: string, clientPhone: string, total: number) {
  const message = `🦊 ¡Hola ${clientName}! Tu pedido en FoxDrop con folio *${orderNumber}* por un total de *$${total.toLocaleString("es-MX")} MXN* ha sido recibido con éxito.\n\nEstamos preparándolo para entrega en Puebla. Puedes darle seguimiento desde tu cuenta. ¡Gracias por tu compra!`;
  return sendWhatsAppMessage(clientPhone, message);
}

/**
 * Plantilla de actualización de estado de pedido (ej. en camino o listo para entrega)
 */
export async function notifyOrderStatusUpdate(orderNumber: string, clientName: string, clientPhone: string, newStatus: string) {
  const statusLabels: Record<string, string> = {
    processing: "en preparación en nuestro almacén",
    shipped: "en ruta con el repartidor hacia tu punto de entrega",
    delivered: "entregado exitosamente",
    cancelled: "ha sido cancelado",
  };

  const statusText = statusLabels[newStatus] || newStatus;
  const message = `🦊 Hola ${clientName}, tu pedido *${orderNumber}* de FoxDrop ahora está *${statusText}*. Si tienes dudas, responde directamente a este mensaje.`;
  return sendWhatsAppMessage(clientPhone, message);
}

/**
 * Plantilla de recuperación de carrito abandonado con código de descuento
 */
export async function notifyAbandonedCartRecovery(clientName: string, clientPhone: string, discountCode = "DESC5") {
  const message = `🦊 ¡Hola ${clientName}! Notamos que dejaste artículos en tu carrito de FoxDrop. Completa tu pedido hoy usando el cupón *${discountCode}* para obtener un 5% de descuento en tu compra internacional. ¿Te apoyamos con algo?`;
  return sendWhatsAppMessage(clientPhone, message);
}
