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
      const prodPrice = Number(prod.price ?? prod.price_mxn ?? prod.sale_price ?? 0);
      let finalImageUrl = prod.image_url || (Array.isArray(prod.images) ? prod.images[0] : "") || "";

      // 1. Generar foto de estudio limpia con FLUX.1 Schnell si está activo
      if (useFlux && falKey) {
        try {
          const fluxRes = await fetch("https://fal.run/fal-ai/flux/schnell", {
            method: "POST",
            headers: {
              Authorization: `Key ${falKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt: `Clean commercial studio product photography of ${prodName}, soft natural lighting, minimalist aesthetic background, high resolution, ultra sharp, no text, no watermarks, no badges`,
              image_size: "square_hd",
              num_inference_steps: 4,
              num_images: 1,
            }),
          });
          const fluxJson = await fluxRes.json();
          if (fluxJson?.images?.[0]?.url) {
            finalImageUrl = fluxJson.images[0].url;
          }
        } catch (err) {
          console.warn("[SocialBroadcast] FLUX fallback a imagen original:", err);
        }
      }

      // 2. Tomar el precio directo del inventario (con sus reglas ya aplicadas) y redactar copy cálido con Sofía
      const totalWithShipping = prodPrice;
      const skuCode = prod.sku || String(prod.id).slice(0, 8).toUpperCase();
      let caption = `¡Hola grupo! Miren esta joyita que tenemos disponible hoy: *${prodName}* 🦊✨\n\nYa te queda en *$${totalWithShipping} MXN con envío incluido* 📦.\n\nSi lo quieres, solo responde a este mensaje con *"yo"* o *"yo lo quiero"* (SKU: [${skuCode}]). ¡Pocas piezas!`;

      if (geminiKey) {
        try {
          const prompt = `Eres Sofía de FoxDrop. Redacta un mensaje corto, cálido y muy natural para un grupo de WhatsApp anunciando este producto de importación:
- Producto: ${prodName}
- Precio ya con envío incluido: $${totalWithShipping} MXN
- SKU obligatorio a incluir exactamente así: [${skuCode}]
- Stock disponible: ${prod.stock} piezas

Reglas:
- Saluda con energía ("¡Hola grupo!", "Miren lo que nos llegó hoy...").
- Indica claramente que el precio ya incluye envío.
- Invita a responder este mensaje con "yo" o "yo lo quiero" para apartarlo 20 minutos al instante.
- Máximo 4 líneas y 2-3 emojis.`;

          const gRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
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
