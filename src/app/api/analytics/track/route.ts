import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { AnalyticsEvent } from "@/types";

const ANALYTICS_BUFFER_FILE = "_system/site_analytics.json";
const MAX_EVENTS_IN_BUFFER = 5000;

export async function POST(req: NextRequest) {
  try {
    let body: AnalyticsEvent | null = null;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    }

    if (!body || !body.eventType || !body.sessionId) {
      return NextResponse.json({ ok: false, error: "Datos de evento incompletos" }, { status: 400 });
    }

    // Agregar datos de geolocalización aproximada desde headers Vercel / Cloudflare
    const country = req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || "MX";
    const city = req.headers.get("x-vercel-ip-city") || "";
    body.country = country;
    if (city) body.city = decodeURIComponent(city);

    const supabase = createServerClient() as any;

    // Cargar buffer actual
    let events: AnalyticsEvent[] = [];
    try {
      const { data: file } = await supabase.storage
        .from("product-images")
        .download(ANALYTICS_BUFFER_FILE);
      if (file) {
        const text = await file.text();
        events = JSON.parse(text || "[]");
      }
    } catch {
      events = [];
    }

    // Añadir nuevo evento al inicio (más reciente primero)
    events.unshift(body);

    // Limitar tamaño del buffer para mantenerlo rápido y ligero
    if (events.length > MAX_EVENTS_IN_BUFFER) {
      events = events.slice(0, MAX_EVENTS_IN_BUFFER);
    }

    // Guardar buffer asíncronamente
    const buffer = Buffer.from(JSON.stringify(events));
    await supabase.storage
      .from("product-images")
      .upload(ANALYTICS_BUFFER_FILE, buffer, {
        contentType: "application/json",
        upsert: true,
      });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // Retornar 200 con ok: false para no alarmar al navegador en beacons
    return NextResponse.json({ ok: false, error: err.message }, { status: 200 });
  }
}
