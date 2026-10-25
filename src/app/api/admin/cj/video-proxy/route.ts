import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/cj/video-proxy?url=...
 * Proxy seguro para streaming y descarga de videos de CJ Dropshipping
 * Inyecta el header Referer de CJ necesario para evitar el error 403 Forbidden
 * y soporta Range requests (seeking y buffering continuo en navegadores)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let targetUrl = (searchParams.get("url") || "").trim();

    if (targetUrl.startsWith("//")) {
      targetUrl = "https:" + targetUrl;
    }

    if (!targetUrl || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
      return new NextResponse("URL de video inválida", { status: 400 });
    }

    const rangeHeader = req.headers.get("range");
    const fetchHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://cjdropshipping.com/",
      "Accept": "video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5",
    };

    if (rangeHeader) {
      fetchHeaders["Range"] = rangeHeader;
    }

    const remoteRes = await fetch(targetUrl, {
      method: "GET",
      headers: fetchHeaders,
    });

    if (!remoteRes.ok && remoteRes.status !== 206) {
      return new NextResponse(`Error obteniendo video de CJ: ${remoteRes.status}`, {
        status: remoteRes.status,
      });
    }

    const contentType = remoteRes.headers.get("content-type") || "video/mp4";
    const contentRange = remoteRes.headers.get("content-range");
    const contentLength = remoteRes.headers.get("content-length");
    const acceptRanges = remoteRes.headers.get("accept-ranges") || "bytes";

    const responseHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Accept-Ranges": acceptRanges,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=604800, immutable",
    };

    if (contentLength) responseHeaders["Content-Length"] = contentLength;
    if (contentRange) responseHeaders["Content-Range"] = contentRange;

    return new NextResponse(remoteRes.body, {
      status: remoteRes.status === 206 ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return new NextResponse(`Error en proxy de video: ${err.message}`, { status: 500 });
  }
}
