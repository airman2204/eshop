import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

const WHATSAPP_GROUP_URL =
  "https://chat.whatsapp.com/BFB3Fo9akFBAAQ6RjMYhWo?s=cl&p=i&iam=2";

/**
 * POST /api/admin/ads/campaign
 * Sofía diseña automáticamente la dirección de arte, copies, guion 15s y segmentación
 * para Instagram o TikTok apuntando al grupo VIP de WhatsApp, y FLUX genera el creativo.
 */
export async function POST(req: NextRequest) {
  try {
    const { objective, platform = "instagram", generateImage = true } = await req.json();

    if (!objective || !String(objective).trim()) {
      return NextResponse.json({ error: "Escribe el objetivo de tu campaña." }, { status: 400 });
    }

    const isTikTok = platform === "tiktok";
    const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
    const groqKey = (process.env.GROQ_API_KEY || "").trim();
    const falKey = (process.env.FAL_KEY || "").trim();

    // Consultar productos reales de Bath & Body Works en inventario para que Sofía arme combos coherentes
    const supabase = createServerClient();
    let { data: realProds } = await (supabase as any)
      .from("products")
      .select("*")
      .gt("stock", 0)
      .ilike("title", "%Bath%Body%")
      .limit(50);

    if (!Array.isArray(realProds) || realProds.length === 0) {
      const fallbackRes = await (supabase as any)
        .from("products")
        .select("*")
        .limit(50);
      realProds = fallbackRes.data;
    }

    const realList = (Array.isArray(realProds) ? realProds : []).filter(
      (p: any) => p.image_url || (Array.isArray(p.images) && p.images[0])
    );
    const getProdImg = (p: any) => p.image_url || (Array.isArray(p.images) && p.images[0]) || "";
    const realNamesText = realList
      .map((p: any) => `- [ID: ${p.id}] ${p.title} ($${p.public_price} MXN)`)
      .join("\n");

    const prompt = `Eres el Director Creativo y Estratega de Growth Marketing de "FoxDrop" (foxdrop.mx), una comunidad privada y tienda de importación en México cuyo eslogan es "Tu atajo al mundo".
Objetivo de esta campaña en ${isTikTok ? "TikTok (9:16 vertical)" : "Instagram (Reels/Stories/Ads 4:5)"}:
"${objective}"

REGLAS ESTRICTAS:
1. POSICIONAMIENTO PREMIUM Y NATURAL (ESPAÑOL DE MÉXICO): NUNCA uses palabras como "lotes", "pacas", "saldos", "hallazgos curados" ni repitas "de EUA". Usa lenguaje directo y natural de México ("drops exclusivos", "piezas exclusivas", "favoritos seleccionados", "lanzamientos limitados", "a precio especial") dentro de nuestra comunidad privada de WhatsApp ("Ventas Flash ⚡ FoxDrop").
2. CURACIÓN DE COMBOS ESTILO BATH & BODY WORKS: Selecciona exactamente 3 productos reales del inventario abajo listado que formen un combo coherente siguiendo las reglas oficiales de Bath & Body Works:
   - Opción 1 (Rutina 3 Pasos / Fragrance Layering): Jabón de ducha + Crema corporal + Bruma corporal (misma fragancia o familia olfativa).
   - Opción 2 (Blend Bar / Mix & Match): Crema corporal base (cálida/fresca) + Bruma floral/frutal + complemento.
   - Opción 3 (Trío de Brumas o Esenciales): 3 productos de la misma categoría para distintas ocasiones.
   Inventario disponible:
${realNamesText || "- Productos originales Bath & Body Works"}
   NO menciones skincare coreano ni ciudades específicas de México (enfoque 100% nacional).
3. En orgánico, CTA pide comentar una palabra clave ("ATAJO", "VIP" o "GRUPO"). En Ads pagados, CTA dirige al enlace: ${WHATSAPP_GROUP_URL}

Devuelve ÚNICAMENTE un JSON válido (sin markdown ni texto extra) con esta estructura exacta:
{
  "campaignName": "Nombre de la campaña",
  "selectedProductIds": ["id1", "id2", "id3"],
  "concepts": [
    {
      "title": "Nombre del concepto",
      "hook3s": "Gancho magnético de 3 segundos",
      "script10s": "Texto en pantalla / Guion corto de 7-10 segundos",
      "copyAndCta": "Copy breve en español de MÉXICO (usa 'Comenta', NUNCA 'Comentá' ni modismos argentinos/españoles) + CTA (orgánico y Ads con ${WHATSAPP_GROUP_URL})",
      "fluxPrompt": "A clean editorial luxury studio photograph of unbranded premium gift boxes, perfume bottles, candles, and body care accessories arranged on a dark emerald green #14352F surface with warm burnt orange #D96B27 accents, soft studio lighting, wide clean empty space at the top for text overlay, strictly zero text, no words, no letters, no logos anywhere in the image"
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
          temperature: 0.75,
          max_tokens: 3000,
          response_format: { type: "json_object" },
        }),
      });
      const gJson = await gRes.json();
      rawJsonText = gJson?.choices?.[0]?.message?.content?.trim() || "";
    }

    const cleaned = rawJsonText
      .replace(/```json|```/gi, "")
      .replace(/[\u0000-\u001F]+/g, " ")
      .trim();

    let strategy: any = null;
    try {
      strategy = JSON.parse(cleaned);
    } catch {
      const startIdx = cleaned.indexOf("{");
      const endIdx = cleaned.lastIndexOf("}");
      if (startIdx !== -1 && endIdx > startIdx) {
        try {
          strategy = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
        } catch {}
      }
    }

    if (!strategy || !Array.isArray(strategy.concepts)) {
      strategy = {
        campaignName: "Drops Exclusivos — Ventas Flash ⚡ FoxDrop",
        concepts: [
          {
            title: "Acceso VIP a Drops Limitados",
            hook3s: "¿Pagas precio completo por tus fragancias favoritas?",
            script10s: "Cada semana soltamos piezas exclusivas de Bath & Body Works a precio especial en nuestro grupo privado.",
            copyAndCta: `Comenta 'ATAJO' para mandarte el acceso privado, o únete directo aquí: ${WHATSAPP_GROUP_URL}`,
            fluxPrompt: "Clean editorial studio composition on dark emerald green #14352F surface with #D96B27 warm lighting, negative space at top, strictly no text",
          },
        ],
      };
    }

    // Resolver los 3 productos elegidos por Sofía para armar el combo
    const chosenIds: string[] = Array.isArray(strategy?.selectedProductIds)
      ? strategy.selectedProductIds.map((id: any) => String(id))
      : [];
    const chosenProducts = chosenIds
      .map((id) => realList.find((p: any) => String(p.id) === id))
      .filter(Boolean);
    const pickSmartCombo = (list: any[]) => {
      const mists = list.filter((p: any) => /bruma|mist/i.test(String(p.title || "")));
      if (mists.length >= 3) return mists.slice(0, 3);
      const bodyCare = list.filter((p: any) => /crema|jab[oó]n|shower|cream|eucalyptus/i.test(String(p.title || "")));
      if (bodyCare.length >= 3) return bodyCare.slice(0, 3);
      const gels = list.filter((p: any) => /gel/i.test(String(p.title || "")));
      if (gels.length >= 3) return gels.slice(0, 3);
      return list.slice(0, 3);
    };
    const comboProducts =
      chosenProducts.length >= 2 ? chosenProducts.slice(0, 3) : pickSmartCombo(realList);
    const comboImageUrls = comboProducts.map(getProdImg).filter(Boolean);

    // Generar creativo editorial multi-producto con fal-ai/nano-banana-pro/edit
    let imageDataUrl = "";
    if (generateImage && falKey) {
      const useMultiImage = comboImageUrls.length > 0;
      const endpoint = useMultiImage
        ? "https://fal.run/fal-ai/nano-banana-pro/edit"
        : "https://fal.run/fal-ai/flux/schnell";
      const fluxPayload = useMultiImage
        ? {
            prompt:
              `Create a ${isTikTok ? "9:16" : "4:5"} vertical luxury editorial promotional graphic featuring these exact ${comboImageUrls.length} Bath & Body Works products arranged together on a sleek circular dark emerald green and brushed gold podium. Deep dark emerald green (#14352F) studio background with subtle golden bokeh sparkles, glowing warm burnt-orange (#D96B27) rim light ring behind the podium, and a cute 3D fox mascot peeking from the right side of the podium. Top header: 'FOXDROP' in warm gold/orange and 'TU ATAJO AL MUNDO' in white. Bold headline: 'DROPS' in white and 'EXCLUSIVOS' in gold. Bottom text: 'BATH & BODY WORKS' and '¡ÚLTIMAS PIEZAS!' in white, plus an orange pill button at the bottom reading 'Únete al Grupo VIP de WhatsApp'. Preserve the exact packaging and labels of the reference products.`,
            image_urls: comboImageUrls,
            aspect_ratio: isTikTok ? "9:16" : "4:5",
            num_images: 1,
            output_format: "jpeg",
          }
        : {
            prompt:
              "Clean editorial luxury studio composition on dark emerald green #14352F surface with #D96B27 warm lighting, negative space at top, strictly no text",
            image_size: isTikTok ? "portrait_16_9" : "portrait_4_3",
            num_inference_steps: 4,
            num_images: 1,
          };

      const fluxRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Key ${falKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fluxPayload),
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
