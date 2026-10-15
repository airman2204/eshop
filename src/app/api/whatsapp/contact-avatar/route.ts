import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || "https://foxdrop-whatsapp-bridge.onrender.com";

/**
 * GET /api/whatsapp/contact-avatar?phone=...&lid=...
 * Consulta bajo demanda el avatar de un contacto en WhatsApp mediante el bridge
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone") || "";
    const lid = searchParams.get("lid") || "";

    if (!phone && !lid) {
      return NextResponse.json({ success: false, error: "phone o lid requerido" }, { status: 400 });
    }

    const query = new URLSearchParams();
    if (phone) query.set("phone", phone);
    if (lid) query.set("lid", lid);

    const res = await fetch(`${BRIDGE_URL}/contact/avatar?${query.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, avatarUrl: "" });
    }

    const data = await res.json();

    // Si encontramos avatar y tenemos chatId o phone, persistir en Supabase para no tener que volver a consultarlo
    if (data.success && data.avatarUrl) {
      const chatId = searchParams.get("chatId");
      try {
        const { createServerClient } = await import("@/lib/supabase/server");
        const supabase = createServerClient() as any;
        if (chatId) {
          await supabase.from("whatsapp_chats").update({ avatar_url: data.avatarUrl }).eq("id", chatId);
        } else if (phone) {
          await supabase.from("whatsapp_chats").update({ avatar_url: data.avatarUrl }).eq("phone", phone);
        }
      } catch (err) {
        console.error("Error persistiendo avatar_url:", err);
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, avatarUrl: "", error: error.message });
  }
}
