import { NextRequest, NextResponse } from "next/server";

interface AdConceptResponse {
  headline: string;
  subheadline: string;
  badge: string;
  urgencyText: string;
  callToAction: string;
  aestheticScene: {
    backgroundStyle: "luxury_marble" | "tropical_fresh" | "neon_night" | "minimal_pastel" | "warm_cozy" | "clean_studio";
    lighting: string;
    props: string[];
    accentColor: string;
    mood: string;
  };
  copyVariations: {
    hook: string;
    body: string;
    ctaButton: string;
    whatsappMessage: string;
  }[];
  suggestedAudience: {
    interests: string[];
    ageRange: string;
    locations: string[];
  };
  generatedImageUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { product, userIdea, targetGoal = "whatsapp", formatRatio = "1:1" } = body;

    if (!product || !product.title) {
      return NextResponse.json({ error: "Producto no proporcionado o inválido." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY no configurada." }, { status: 500 });
    }

    const systemPrompt = `Eres el Director Creativo de Publicidad Digital de FoxDrop (estilo SaleADS.ai y agencias D2C virales en Instagram, TikTok y Meta Ads).
Tu objetivo es transformar un producto real y una idea en un ANUNCIO PUBLICITARIO VISUALMENTE HIPNÓTICO Y COMERCIALMENTE IRRESISTIBLE que detenga el scroll y genere ventas o mensajes inmediatos a WhatsApp.

REGLAS DE DISEÑO Y ESTRATEGIA:
1. NUNCA propongas diseños genéricos ni textos aburridos.
2. Identifica el DESEO EMOCIONAL o el DOLOR real del comprador (ej: oler delicioso todo el día, tener un detalle elegante sin gastar de más, frescura al instante).
3. Selecciona una atmósfera estética de fondo (backgroundStyle) entre: 'luxury_marble', 'tropical_fresh', 'neon_night', 'minimal_pastel', 'warm_cozy', 'clean_studio'.
4. Formula 3 variaciones de copy con la técnica AIDA (Atención, Interés, Deseo, Acción):
   - Variación 1: Ángulo Deseo / Sensorial.
   - Variación 2: Ángulo Regalo / Detalle accesible.
   - Variación 3: Ángulo Urgencia / Stock Físico Inmediato.
5. Formula un prompt en inglés hiper-detallado ("imagePrompt") para generar una fotografía publicitaria de producto fotorrealista con FLUX.1.
   El prompt debe describir una escena comercial de catálogo de lujo donde el producto sea el héroe central, con iluminación cinematográfica de estudio, sombras de contacto suaves, texturas reales (mármol, madera o lino) y composición publicitaria.
   REGLA CRUCIAL PARA LA IMAGEN: Prohibido incluir letras, tipografías, logotipos escritos, precios ni texto falso dentro de la imagen. La fotografía debe ser 100% limpia y cinematográfica (solo el producto y su entorno estético).`;

    const userPrompt = `PRODUCTO:
- Título: ${product.title}
- Precio: $${product.price} MXN
- Categoría: ${product.category || "General"}
- Stock Físico: ${product.stock || 1} piezas
- Descripción/Notas: ${product.description || "Producto importado premium"}

IDEA / ÁNGULO DEL ANUNCIO DESEADO POR EL USUARIO:
${userIdea ? `"${userIdea}"` : "Crea el ángulo publicitario más viral y con mayor probabilidad de venta inmediata para este artículo."}

OBJETIVO PRINCIPAL: ${targetGoal === "whatsapp" ? "Mensajes directos a WhatsApp para cerrar venta" : "Tráfico directo al checkout de la tienda FoxDrop"}

Devuelve ÚNICAMENTE un JSON válido con esta estructura exacta:
{
  "headline": "Titular corto y llamativo (máx 6 palabras)",
  "subheadline": "Subtítulo que refuerza el beneficio clave (máx 10 palabras)",
  "badge": "Sello de impacto (ej: ORIGINAL IMPORTADO, ENTREGA HOY, AROMA TOP)",
  "urgencyText": "Texto de escasez o garantía (ej: Pocas piezas en stock físico)",
  "callToAction": "Texto del botón (ej: Pedir por WhatsApp)",
  "imagePrompt": "Detailed commercial product advertisement photograph of [the specific product], luxury studio setting, soft cinematic lighting, elegant props matching the scent or style, depth of field, 8k, hyper-realistic commercial catalogue photography",
  "aestheticScene": {
    "backgroundStyle": "luxury_marble",
    "lighting": "Descripción de iluminación",
    "props": ["Vainilla dulce", "Gotas de frescura", "Fondo mármol"],
    "accentColor": "#E65F2B",
    "mood": "Sensorial y elegante"
  },
  "copyVariations": [
    {
      "hook": "Gancho inicial para los primeros 3 segundos",
      "body": "Cuerpo del anuncio persuasivo con emojis",
      "ctaButton": "Pedir Promo",
      "whatsappMessage": "Hola FoxDrop! Vi el anuncio del ${product.title} y quiero pedir uno para entrega hoy 🦊✨"
    }
  ],
  "suggestedAudience": {
    "interests": ["Bath & Body Works", "Cuidado personal", "Regalos y detalles"],
    "ageRange": "18 - 35 años",
    "locations": ["Puebla", "México"]
  }
}`;

    const models = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-2.5-flash-lite"];
    let rawText = "";

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: userPrompt }] }],
              systemInstruction: { parts: [{ text: systemPrompt }] },
              generationConfig: {
                temperature: 0.8,
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (rawText) break;
        }
      } catch (err) {
        console.warn(`Error probando modelo ${model}:`, err);
      }
    }

    if (!rawText) {
      return NextResponse.json({ error: "No se pudo generar la estrategia de anuncio con la IA." }, { status: 502 });
    }

    const parsed: AdConceptResponse & { imagePrompt?: string } = JSON.parse(rawText);

    // =========================================================================
    // GENERAR FOTOGRAFÍA PUBLICITARIA FOTORREALISTA CON FAL.AI (FLUX.1 SCHNELL)
    // =========================================================================
    const falKey = process.env.FAL_KEY || "fal_sk_e0a6882ce81147e082a218a95380f4c5:8753267f98da4b14ec5124a872fe147f";
    if (falKey) {
      try {
        const promptToUse = parsed.imagePrompt || `Commercial high-end studio product advertisement photograph of ${product.title}, luxury aesthetic lighting, elegant background, 8k professional e-commerce`;
        const imageSize = formatRatio === "9:16" ? "portrait_16_9" : "square_hd";

        const falRes = await fetch("https://fal.run/fal-ai/flux/schnell", {
          method: "POST",
          headers: {
            Authorization: `Key ${falKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: promptToUse,
            image_size: imageSize,
            num_inference_steps: 4,
            enable_safety_checker: true,
          }),
        });

        if (falRes.ok) {
          const falData = await falRes.json();
          if (falData.images && falData.images[0]?.url) {
            parsed.generatedImageUrl = falData.images[0].url;
          }
        } else {
          console.warn("FAL.AI generation returned non-OK:", await falRes.text());
        }
      } catch (falErr) {
        console.error("Error llamando a fal.ai:", falErr);
      }
    }

    return NextResponse.json({ success: true, ad: parsed });
  } catch (error: any) {
    console.error("Error en /api/admin/ads/generate:", error);
    return NextResponse.json({ error: error.message || "Error procesando anuncio." }, { status: 500 });
  }
}
