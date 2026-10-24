import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/whatsapp/image-proxy?url=...
 * Proxy seguro para descargar imágenes de WhatsApp (pps.whatsapp.net) y servirlas localmente,
 * evitando problemas de Referrer, CORS o bloqueo de navegadores.
 */
const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" fill="none"><rect width="400" height="400" rx="24" fill="#F8FAFC"/><rect x="140" y="130" width="120" height="100" rx="12" stroke="#CBD5E1" stroke-width="8"/><circle cx="175" cy="165" r="10" fill="#CBD5E1"/><path d="M148 215L185 180L215 208L235 190L252 215" stroke="#CBD5E1" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><text x="200" y="265" text-anchor="middle" fill="#94A3B8" font-family="sans-serif" font-size="16" font-weight="bold">FOXDROP</text></svg>`;

function svgFallbackResponse() {
  return new NextResponse(FALLBACK_SVG, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=300",
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let targetUrl = (searchParams.get("url") || "").trim();

    if (targetUrl.startsWith("//")) {
      targetUrl = "https:" + targetUrl;
    }

    if (!targetUrl || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
      return svgFallbackResponse();
    }

    let res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      return svgFallbackResponse();
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
      },
    });
  } catch {
    return svgFallbackResponse();
  }
}
