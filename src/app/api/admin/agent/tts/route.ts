import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text");

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Texto requerido" }, { status: 400 });
    }

    // Limpieza profunda de markdown, URLs, viñetas y emojis
    const cleanText = text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/#+\s*/g, "")
      .replace(/https?:\/\/\S+/g, "enlace")
      .replace(/[•▪\-\*]\s+/g, ". ")
      .replace(/[#_~><\[\]()$]/g, "")
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) {
      return NextResponse.json({ error: "Texto vacío después de limpiar" }, { status: 400 });
    }

    // 1. Motor Primario de Alta Fidelidad: Microsoft Neural - Voz de Hombre Mexicano (es-MX-JorgeNeural / es-MX-RaulNeural)
    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata("es-MX-JorgeNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      
      const { audioStream } = tts.toStream(cleanText);
      const audioChunks: Buffer[] = [];

      await new Promise((resolve, reject) => {
        audioStream.on("data", (chunk: Buffer) => audioChunks.push(chunk));
        audioStream.on("end", resolve);
        audioStream.on("error", reject);
      });

      if (audioChunks.length > 0) {
        const mergedBuffer = Buffer.concat(audioChunks);
        return new NextResponse(mergedBuffer, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
            "Content-Length": mergedBuffer.length.toString(),
          },
        });
      }
    } catch (edgeErr) {
      console.warn("Fallo motor neural JorgeNeural, usando fallback Google TTS:", edgeErr);
    }

    // 2. Fallback de respaldo: Google TTS
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      cleanText.slice(0, 180)
    )}&tl=es-MX&client=tw-ob`;

    const resFallback = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (resFallback.ok) {
      const arrayBuf = await resFallback.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=86400",
          "Content-Length": buffer.length.toString(),
        },
      });
    }

    return NextResponse.json({ error: "No se pudo generar audio" }, { status: 500 });
  } catch (err: any) {
    console.error("Error en /api/admin/agent/tts:", err);
    return NextResponse.json({ error: err.message || "Error al procesar audio" }, { status: 500 });
  }
}
