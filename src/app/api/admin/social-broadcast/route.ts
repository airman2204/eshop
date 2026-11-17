import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/social-broadcast
 * Genera foto de estudio con FLUX (fal.ai) + copy humano con Sofía (Gemini)
 * y envía la oferta al grupo de WhatsApp (@g.us) vía Render Bridge.
 */
export async function POST(req: NextRequest) {
  try {
    const { productIds, groupJid, useFlux = true, previewOnly = false, previews } = await req.json();

    const bridgeUrl = process.env.WHATSAPP_BRIDGE_URL || "https://foxdrop-whatsapp-bridge.onrender.com";
    const bridgeApiKey = process.env.WHATSAPP_BRIDGE_API_KEY || "foxdrop_secret_2026";

    // Modo envío directo desde vista previa ya aprobada
    if (Array.isArray(previews) && previews.length > 0) {
      if (!groupJid) {
        return NextResponse.json({ error: "Selecciona un grupo de WhatsApp." }, { status: 400 });
      }
      const sentResults: any[] = [];
      for (const item of previews) {
        const sendRes = await fetch(`${bridgeUrl}/message/sendText`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": bridgeApiKey,
          },
          body: JSON.stringify({
            number: groupJid,
            phone: groupJid,
            text: item.caption,
            message: item.caption,
            mediaUrl: item.imageUrl || undefined,
          }),
        });
        sentResults.push({ id: item.id, name: item.name, sent: sendRes.ok });
      }
      return NextResponse.json({ success: true, results: sentResults });
    }

    if (!Array.isArray(productIds) || productIds.length === 0 || (!previewOnly && !groupJid)) {
      return NextResponse.json(
        { error: "Selecciona al menos 1 producto." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { data: products, error } = await (supabase as any)
      .from("products")
      .select("*")
      .in("id", productIds);

    if (error || !products?.length) {
      return NextResponse.json({ error: "No se encontraron los productos." }, { status: 404 });
    }

    const falKey = process.env.FAL_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    const results: any[] = [];

    for (const prod of products) {
      const prodName = prod.name || prod.title || "Producto FoxDrop";
      const prodPrice = Number(prod.public_price ?? prod.publicPrice ?? prod.price ?? prod.price_mxn ?? prod.sale_price ?? 0);
      let finalImageUrl = prod.image_url || (Array.isArray(prod.images) ? prod.images[0] : "") || "";

      // 1. Generar foto de estudio limpia con FLUX usando la foto real como referencia (Image-to-Image)
      if (useFlux && falKey) {
        try {
          const endpoint = finalImageUrl
            ? "https://fal.run/fal-ai/flux/dev/image-to-image"
            : "https://fal.run/fal-ai/flux/schnell";
          const payload = finalImageUrl
            ? {
                image_url: finalImageUrl,
                strength: 0.35,
                prompt: `Keep the exact original product unchanged, enhance lighting and sharpness slightly, clean studio background, no extra text, no watermarks`,
                num_inference_steps: 20,
                num_images: 1,
              }
            : {
                prompt: `Clean commercial studio product photography of ${prodName}, soft natural lighting, minimalist aesthetic background, high resolution, ultra sharp, no text, no watermarks, no badges`,
                image_size: "square_hd",
                num_inference_steps: 4,
                num_images: 1,
              };

          const fluxRes = await fetch(endpoint, {
            method: "POST",
            headers: {
              Authorization: `Key ${falKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });
          const fluxJson = await fluxRes.json();
          if (fluxJson?.images?.[0]?.url) {
            finalImageUrl = fluxJson.images[0].url;
          }
        } catch (err) {
          console.warn("[SocialBroadcast] FLUX fallback a imagen original:", err);
        }
      }

      // 2. Buscar hasta 2 productos relacionados en stock para cross-selling (misma marca/fragancia)
      let relatedText = "";
      try {
        const { data: allStock } = await (supabase as any)
          .from("products")
          .select("*")
          .gt("stock", 0)
          .neq("id", prod.id)
          .limit(30);

        if (Array.isArray(allStock) && allStock.length > 0) {
          const words = prodName
            .toLowerCase()
            .replace(/[()]/g, " ")
            .split(/\s+/)
            .filter((w: string) => w.length >= 4 && !["para", "linea", "línea", "importado", "fragancia", "producto"].includes(w));

          const related = allStock
            .filter((other: any) => {
              const txt = `${other.name || other.title || ""} ${other.brand || ""}`.toLowerCase();
              return words.some((w: string) => txt.includes(w));
            })
            .slice(0, 2);

          if (related.length > 0) {
            relatedText = related
              .map((r: any) => `${r.name || r.title} ($${Number(r.public_price ?? r.publicPrice ?? r.price ?? r.price_mxn ?? 0)} MXN)`)
              .join(" y ");
          }
        }
      } catch {}

      // 3. Tomar el precio directo del inventario (con sus reglas ya aplicadas) y redactar copy cálido con Sofía
      const totalWithShipping = prodPrice;
      const skuCode = prod.sku || String(prod.id).slice(0, 8).toUpperCase();
      let caption = `¡Hola grupo! Miren esta joyita que tenemos disponible hoy: *${prodName}* 🦊✨\n\nYa te queda en *$${totalWithShipping} MXN con envío incluido* 📦.\n\nSi lo quieres, solo responde a este mensaje con *"yo"* o *"yo lo quiero"* (SKU: [${skuCode}]). ¡Pocas piezas!`;

      if (geminiKey) {
        try {
          const prompt = `Eres Sofía, experta en Social Commerce y ventas de FoxDrop. Redacta un mensaje corto, persuasivo y 100% natural para el grupo de WhatsApp vendiendo este artículo:
- Producto: ${prodName}
- Precio ya con envío incluido: $${totalWithShipping} MXN
- Stock disponible: ${prod.stock} piezas${relatedText ? `\n- Productos relacionados en stock para combinar: ${relatedText}` : ""}

Reglas de estilo y autonomía:
- NO empieces saludando con "¡Hola grupo!" (ya estamos en confianza platicando; ve directo al grano con un gancho atractivo: curiosidad, beneficio, antojo o escasez).
- Indica claramente el precio ($${totalWithShipping} MXN ya con envío incluido).
- Invita a responder este mensaje con "yo" para apartarlo.${relatedText ? `\n- Al final, sugiere brevemente combinarlo con: ${relatedText}.` : ""}
- Máximo 3-4 líneas completas y 2 emojis.`

          const gRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.85,
                  maxOutputTokens: 2048,
                  thinkingConfig: { thinkingBudget: 0 },
                },
              }),
            }
          );
          const gJson = await gRes.json();
          const generated = gJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (generated) caption = generated;
        } catch (err) {
          console.warn("[SocialBroadcast] Gemini fallback:", err);
        }
      }

      // 3. Si es solo vista previa, devolver sin enviar todavía
      if (previewOnly) {
        results.push({
          id: prod.id,
          name: prodName,
          sku: skuCode,
          caption,
          imageUrl: finalImageUrl,
        });
        continue;
      }

      // 4. Enviar al grupo de WhatsApp vía Render Bridge
      const sendRes = await fetch(`${bridgeUrl}/message/sendText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": bridgeApiKey,
        },
        body: JSON.stringify({
          number: groupJid,
          phone: groupJid,
          text: caption,
          message: caption,
          mediaUrl: finalImageUrl || undefined,
        }),
      });

      results.push({
        id: prod.id,
        name: prod.name,
        sku: skuCode,
        sent: sendRes.ok,
        imageUrl: finalImageUrl,
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error("[SocialBroadcast] Error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
