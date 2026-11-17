import { NextResponse } from "next/server";

export async function GET() {
  const bridgeUrl = process.env.WHATSAPP_BRIDGE_URL || "https://foxdrop-whatsapp-bridge.onrender.com";
  const apiKey = process.env.WHATSAPP_BRIDGE_API_KEY || "foxdrop_secret_2026";
  try {
    const res = await fetch(`${bridgeUrl}/groups`, {
      headers: { "x-api-key": apiKey },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ groups: [], error: err?.message }, { status: 500 });
  }
}
