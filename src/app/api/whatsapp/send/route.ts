import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { formatPhoneNumber } from "@/lib/whatsapp";

/**
 * POST /api/whatsapp/send
 * Dispara el mensaje al bridge o servicio WhatsApp (Baileys / Evolution / Gateway)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, text, senderName } = body;

    if (!phone || !text) {
      return NextResponse.json({ error: "Teléfono y texto requeridos" }, { status: 400 });
    }

    const cleanPhone = formatPhoneNumber(phone);
    const bridgeUrl = process.env.WHATSAPP_BRIDGE_URL; // Ej: http://localhost:8080 o https://mi-bridge.railway.app
    const bridgeApiKey = process.env.WHATSAPP_BRIDGE_API_KEY;

    // Si hay un bridge configurado en .env.local, le despachamos la orden de envío
    if (bridgeUrl) {
      try {
        const bridgeRes = await fetch(`${bridgeUrl}/message/sendText`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(bridgeApiKey ? { "apikey": bridgeApiKey, "Authorization": `Bearer ${bridgeApiKey}` } : {})
          },
          body: JSON.stringify({
            number: cleanPhone,
            text: text,
          }),
        });

        const bridgeData = await bridgeRes.json();
        return NextResponse.json({ success: true, bridgeData });
      } catch (err: any) {
        console.warn("Fallo conectando con WHATSAPP_BRIDGE_URL:", err.message);
      }
    }

    // Modo Standalone: El mensaje ya quedó registrado en Supabase para ambos socios
    return NextResponse.json({ success: true, mode: "standalone_synced" });
  } catch (error: any) {
    console.error("Error en /api/whatsapp/send:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
