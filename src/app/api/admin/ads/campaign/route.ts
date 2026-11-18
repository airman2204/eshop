import { NextRequest, NextResponse } from "next/server";

const WHATSAPP_GROUP_URL =
  "https://chat.whatsapp.com/BFB3Fo9akFBAAQ6RjMYhWo?s=cl&p=i&iam=2";

/**
 * POST /api/admin/ads/campaign
 * Sofía diseña automáticamente la dirección de arte, copies, guion 15s y segmentación
 * para Instagram o TikTok apuntando al grupo VIP de WhatsApp, y FLUX genera el creativo.
 */
export async function POST(req: NextRequest) {
  try {
    const { objective, platform = "instagram" } = await req.json();

    if (!objective || !String(objective).trim()) {
      return NextResponse.json({ error: "Escribe el objetivo de tu campaña." }, { status: 400 });
    }

    const isTikTok = platform === "tiktok";
    const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
    const groqKey = (process.env.GROQ_API_KEY || "").trim();
    const falKey = (process.env.FAL_KEY || "").trim();

    const prompt = `Eres el Director Creativo y Estratega de Growth Marketing de "FoxDrop" (foxdrop.mx), una comunidad privada y tienda de importación en México cuyo eslogan es "Tu atajo al mundo".
Objetivo de esta campaña en ${isTikTok ? "TikTok (9:16 vertical)" : "Instagram (Reels/Stories/Ads 4:5)"}:
"${objective}"

REGLAS ESTRICTAS:
1. POSICIONAMIENTO PREMIUM: NUNCA uses palabras como "lotes", "pacas", "saldos" ni repitas "de EUA". Posiciona a FoxDrop como una marca moderna de "Drops exclusivos", "hallazgos curados" y "lanzamientos de piezas limitadas" con precios preferenciales dentro de nuestra comunidad privada de WhatsApp ("Ventas Flash ⚡ FoxDrop").
2. FLEXIBILIDAD DE CATÁLOGO: Presenta el grupo como el lugar donde caen lanzamientos sorpresa cada semana (fragancias, cuidado personal, accesorios y artículos virales originales) en cantidades limitadas, enfocándote en la exclusividad de entrar al grupo antes de que se agoten. NO menciones skincare coreano ni ciudades específicas de México (enfoque 100% nacional).
3. En orgánico, CTA pide comentar una palabra clave ("ATAJO", "VIP" o "GRUPO"). En Ads pagados, CTA dirige al enlace: ${WHATSAPP_GROUP_URL}

Devuelve ÚNICAMENTE un JSON válido (sin markdown ni texto extra) con esta estructura exacta:
{
  "campaignName": "Nombre de la campaña",
  "concepts": [
    {
      "title": "Nombre del concepto",
      "hook3s": "Gancho magnético de 3 segundos",
      "script10s": "Texto en pantalla / Guion corto de 7-10 segundos",
      "copyAndCta": "Copy breve para descripción + CTA (orgánico y Ads con ${WHATSAPP_GROUP_URL})",
      "fluxPrompt": "Prompt detallado en inglés para FLUX: publicidad moderna e-commerce, paleta verde bosque oscuro #14352F y acentos naranja/dorado #D96B27, cajas de importación premium con productos variados de EUA (perfumería, cuidado corporal, termos, accesorios), espacio negativo limpio arriba para poner texto encima, cero texto dentro de la imagen, cero marcas de agua"
    }
  ]
}
Genera exactamente 3 conceptos muy distintos entre sí.`;

    let rawJsonText = "";

    if (geminiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
            }),
          }
        );
        const j = await res.json();
        rawJsonText = j?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      } catch {}
    }

    if (!rawJsonText && groqKey) {
      const gRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.8,
          max_tokens: 1800,
        }),
      });
      const gJson = await gRes.json();
      rawJsonText = gJson?.choices?.[0]?.message?.content?.trim() || "";
    }

    const cleaned = rawJsonText.replace(/```json|```/gi, "").trim();
    const strategy = JSON.parse(cleaned);

    // Generar creativo de agencia con FLUX usando el primer concepto
    let imageDataUrl = "";
    const firstFluxPrompt = strategy?.concepts?.[0]?.fluxPrompt || strategy?.artDirectionPrompt;
    if (falKey && firstFluxPrompt) {
      const fluxRes = await fetch("https://fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: {
          Authorization: `Key ${falKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: firstFluxPrompt,
          image_size: isTikTok ? "portrait_16_9" : "portrait_4_3",
          num_inference_steps: 4,
          num_images: 1,
        }),
      });
      const fluxJson = await fluxRes.json();
      const imgUrl = fluxJson?.images?.[0]?.url;
      if (imgUrl) {
        try {
          const imgRes = await fetch(imgUrl);
          const buf = Buffer.from(await imgRes.arrayBuffer());
          imageDataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;
        } catch {
          imageDataUrl = imgUrl;
        }
      }
    }

    return NextResponse.json({
      success: true,
      platform,
      strategy,
      imageUrl: imageDataUrl,
    });
  } catch (err: any) {
    console.error("[AdsCampaign] Error:", err);
    return NextResponse.json(
      { error: err?.message || "No se pudo generar la campaña." },
      { status: 500 }
    );
  }
}
