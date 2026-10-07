import { NextRequest, NextResponse } from "next/server";

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL || "https://foxdrop-whatsapp-bridge.onrender.com";

/**
 * GET /api/whatsapp/profile
 * Obtiene los datos del perfil propio de FoxDrop desde el bridge (nombre, teléfono, avatarUrl, status)
 */
export async function GET() {
  try {
    const res = await fetch(`${BRIDGE_URL}/profile/myInfo`, {
      method: "GET",
      cache: "no-store",
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text.includes("<!DOCTYPE") ? "El puente de WhatsApp está despertando o reconectando" : text };
    }

    if (!res.ok) {
      return NextResponse.json({ success: false, error: data.error || "WhatsApp no está conectado" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Error al conectar con WhatsApp" }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/profile
 * Actualiza la foto de perfil o el estado en WhatsApp
 * Body: { action: 'picture' | 'status', imageBase64?: string, status?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, imageBase64, status } = body;

    if (action === "picture") {
      if (!imageBase64) {
        return NextResponse.json({ error: "imageBase64 requerida" }, { status: 400 });
      }

      const res = await fetch(`${BRIDGE_URL}/profile/updatePicture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });

      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { data = { error: text.includes("<!DOCTYPE") ? "Servidor de WhatsApp reiniciando" : text }; }
      return NextResponse.json(data, { status: res.status });
    }

    if (action === "status") {
      if (!status) {
        return NextResponse.json({ error: "status requerido" }, { status: 400 });
      }

      const res = await fetch(`${BRIDGE_URL}/profile/updateStatus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch { data = { error: text.includes("<!DOCTYPE") ? "Servidor de WhatsApp reiniciando" : text }; }
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error conectando al bridge" }, { status: 500 });
  }
}
