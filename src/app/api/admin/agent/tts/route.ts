import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text");

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Texto requerido" }, { status: 400 });
    }

    // Limpiar caracteres extraños, markdown y recortar a longitud segura (Google TTS max ~200 chars por chunk)
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

    // Dividir en fragmentos respetando oraciones para evitar cortar palabras
    const sentences = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanText];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      if ((currentChunk + " " + trimmed).length <= 180) {
        currentChunk = currentChunk ? currentChunk + " " + trimmed : trimmed;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        // Si una sola oración excede los 180 caracteres, partirla por comas o palabras
        if (trimmed.length > 180) {
          const words = trimmed.split(" ");
          let subChunk = "";
          for (const word of words) {
            if ((subChunk + " " + word).length <= 180) {
              subChunk = subChunk ? subChunk + " " + word : word;
            } else {
              if (subChunk) chunks.push(subChunk);
              subChunk = word;
            }
          }
          if (subChunk) chunks.push(subChunk);
          currentChunk = "";
        } else {
          currentChunk = trimmed;
        }
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    // Descargar cada chunk de Google TTS con acento mexicano nativo (es-MX)
    const audioBuffers: Buffer[] = [];
    for (const chunk of chunks.slice(0, 15)) { // hasta ~2,500 caracteres
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
        chunk
      )}&tl=es-MX&client=tw-ob`;

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (response.ok) {
        const arrayBuf = await response.arrayBuffer();
        audioBuffers.push(Buffer.from(arrayBuf));
      }
    }

    if (audioBuffers.length === 0) {
      return NextResponse.json({ error: "No se pudo generar audio" }, { status: 500 });
    }

    const mergedBuffer = Buffer.concat(audioBuffers);

    return new NextResponse(mergedBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Content-Length": mergedBuffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error("Error en /api/admin/agent/tts:", err);
    return NextResponse.json({ error: err.message || "Error al procesar audio" }, { status: 500 });
  }
}
