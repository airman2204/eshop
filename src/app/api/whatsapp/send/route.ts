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
    const bridgeUrl = process.env.WHATSAPP_BRIDGE_URL || "https://foxdrop-whatsapp-bridge.onrender.com";
    const bridgeApiKey = process.env.WHATSAPP_BRIDGE_API_KEY || "foxdrop_secret_2026";

    // Despachar la orden de envío al bridge de WhatsApp
    if (bridgeUrl) {
      try {
        const supabase = createServerClient();
        
        let targetNumber = cleanPhone;

        // Si tenemos chatId o teléfono, verificar si el chat tiene un LID registrado para despachar sin error de cifrado
        if (body.chatId) {
          const { data: chatRow } = await supabase
            .from("whatsapp_chats")
            .select("notes")
            .eq("id", body.chatId)
            .maybeSingle();

          if (chatRow?.notes) {
            try {
              const parsed = typeof chatRow.notes === "string" ? JSON.parse(chatRow.notes) : chatRow.notes;
              if (parsed?.lid) {
                targetNumber = `${parsed.lid}@lid`;
              }
            } catch {}
          }
        }

        // Si no se usó LID, formatear número estándar para Baileys
        if (!targetNumber.includes("@lid")) {
          const digits = cleanPhone.replace(/\D/g, "");
          if (digits.startsWith("52") && digits.length === 12 && !digits.startsWith("521")) {
            targetNumber = `521${digits.slice(2)}`;
          }
        }

        const bridgeRes = await fetch(`${bridgeUrl}/message/sendText`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(bridgeApiKey ? { "apikey": bridgeApiKey, "Authorization": `Bearer ${bridgeApiKey}` } : {})
          },
          body: JSON.stringify({
            number: targetNumber,
            text: text,
            type: body.mediaType || body.type,
            imageUrl: body.mediaUrl || body.imageUrl,
          }),
        });

        const bridgeData = await bridgeRes.json();
        
        if (!bridgeRes.ok) {
          console.error("Bridge devolvió error:", bridgeData);
          return NextResponse.json({ error: bridgeData.error || "Error en bridge" }, { status: bridgeRes.status });
        }

        return NextResponse.json({ success: true, bridgeData });
      } catch (err: any) {
        console.warn("Fallo conectando con WHATSAPP_BRIDGE_URL:", err.message);
        return NextResponse.json({ error: "No se pudo contactar al bridge de WhatsApp: " + err.message }, { status: 502 });
      }
    }

    // Modo Standalone: El mensaje ya quedó registrado en Supabase para ambos socios
    return NextResponse.json({ success: true, mode: "standalone_synced" });
  } catch (error: any) {
    console.error("Error en /api/whatsapp/send:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}
