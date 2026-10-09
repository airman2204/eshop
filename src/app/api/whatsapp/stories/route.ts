import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || "https://foxdrop-whatsapp-bridge.onrender.com";

/**
 * GET /api/whatsapp/stories
 * Lista las historias / estados activos de WhatsApp (tanto de FoxDrop como de contactos)
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    // Intentar consultar historias guardadas en Supabase (si existe la tabla o en whatsapp_chats notes)
    const { data: dbStories, error } = await (supabase as any)
      .from("whatsapp_stories")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (!error && dbStories && dbStories.length > 0) {
      return NextResponse.json({ success: true, stories: dbStories });
    }

    // Sin historias ficticias: solo historias 100% reales
    return NextResponse.json({
      success: true,
      stories: [],
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/stories
 * Publica una nueva historia / estado en el WhatsApp conectado
 * Body: { mediaUrl: string, caption?: string, mediaBase64?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mediaUrl, caption, mediaBase64 } = body;

    if (!mediaUrl && !mediaBase64) {
      return NextResponse.json({ error: "Imagen o URL requerida para la historia" }, { status: 400 });
    }

    const supabase = createServerClient();

    // 1. Despachar al bridge de WhatsApp
    let bridgeDispatched = false;
    try {
      const bridgeRes = await fetch(`${BRIDGE_URL}/status/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: mediaUrl,
          imageBase64: mediaBase64,
          caption: caption || "",
        }),
      });
      if (bridgeRes.ok) {
        bridgeDispatched = true;
      }
    } catch (bridgeErr) {
      console.warn("Bridge no disponible para historias en este momento:", bridgeErr);
    }

    // 2. Persistir localmente en Supabase si la tabla existe
    const storyId = `story_${Date.now()}`;
    const newStory = {
      id: storyId,
      author_name: "Foxdrop Oficial",
      author_phone: "Foxdrop",
      is_my_status: true,
      media_url: mediaUrl || mediaBase64,
      caption: caption || "",
      created_at: new Date().toISOString(),
    };

    try {
      await (supabase as any).from("whatsapp_stories").insert(newStory);
    } catch {}

    return NextResponse.json({
      success: true,
      bridgeDispatched,
      story: {
        id: storyId,
        authorName: "Foxdrop Oficial",
        authorPhone: "Foxdrop",
        isMyStatus: true,
        mediaUrl: mediaUrl || mediaBase64,
        caption: caption || "",
        createdAt: new Date().toISOString(),
        viewed: false,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
