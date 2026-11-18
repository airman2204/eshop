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

    const prompt = `Eres Sofía, Directora Creativa y Strategist de Performance Marketing para FoxDrop México (importación directa de EUA, lotes Bath & Body Works, entregas personales en Puebla/Cholula y envíos a todo México).
El dueño quiere lanzar una campaña en ${isTikTok ? "TikTok Ads / Reels (9:16 vertical)" : "Instagram Ads (4:5 editorial)"} con este objetivo:
"${objective}"

Enlace obligatorio del grupo de WhatsApp: ${WHATSAPP_GROUP_URL}

Devuelve ÚNICAMENTE un JSON válido (sin markdown ni texto extra) con esta estructura exacta:
{
  "campaignName": "Nombre corto y atractivo de la campaña",
  "artDirectionPrompt": "Prompt en inglés ultra detallado de dirección de arte editorial de agencia de lujo para FLUX: colección variada de productos Bath & Body Works (velas, brumas, cremas, geles) en composición de diseño gráfico profesional, paleta verde esmeralda oscuro #14352F y acentos dorados/ámbar #D96B27, iluminación de estudio cinematográfica, ${isTikTok ? "composición vertical 9:16 con aire limpio arriba y abajo" : "composición editorial 4:5 de revista"}, cero texto, cero letras falsas, cero marcas de agua",
  "copies": [
    { "angle": "Nombre del ángulo", "hook": "Gancho inicial que detiene el scroll", "body": "Texto persuasivo en español de México listo para copiar y pegar con el link ${WHATSAPP_GROUP_URL}", "cta": "Texto corto del botón" }
  ],
  "tiktokScript15s": "Guion rápido de 15 segundos (Escena 1, Escena 2, Cierre con CTA al grupo de WhatsApp)",
  "audience": {
    "locations": ["Puebla", "San Andrés Cholula", "México"],
    "ageRange": "20-45",
    "interests": ["Bath & Body Works", "Perfumes y Fragancias", "Compras Online"]
  }
}
Genera 4 copies muy distintos entre sí (no genéricos, tono mexicano natural).`;

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

    // Generar creativo de agencia con FLUX
    let imageDataUrl = "";
    if (falKey && strategy.artDirectionPrompt) {
      const fluxRes = await fetch("https://fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: {
          Authorization: `Key ${falKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: strategy.artDirectionPrompt,
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
