import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/whatsapp/image-proxy?url=...
 * Proxy seguro para descargar imágenes de WhatsApp (pps.whatsapp.net) y servirlas localmente,
 * evitando problemas de Referrer, CORS o bloqueo de navegadores.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
      return new NextResponse("URL inválida", { status: 400 });
    }

    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      return new NextResponse("Error al descargar imagen", { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
      },
    });
  } catch (err: any) {
    return new NextResponse(err.message || "Error interno del proxy", { status: 500 });
  }
}
