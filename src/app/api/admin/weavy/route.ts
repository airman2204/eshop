import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyAdminToken, checkRateLimit } from "@/lib/security";

/**
 * ============================================================================
 * FOXDROP WEAVY AI STUDIO API (/api/admin/weavy)
 * ============================================================================
 * - Gestión persistente de flujos/proyectos visuales (Save / Load / List)
 * - Generación de Imágenes Publicitarias con Gemini Imagen 3 / Flash Image
 * - Generación de Prompts automáticos asistidos por IA para video y fotografía
 * - Pipeline Image-to-Video con Google Veo / Gemini Omni Flash
 */

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token || !verifyAdminToken(token)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    // ──────────────────────────────────────────────────────────────────────────
    // 1. LISTAR O CARGAR PROYECTOS / FLUJOS GUARDADOS
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "list_flows") {
      try {
        const { data: file } = await supabase.storage
          .from("product-images")
          .download("_system/weavy_flows.json");
        const flows = file ? JSON.parse((await file.text()) || "[]") : [];
        return NextResponse.json({ success: true, flows });
      } catch {
        return NextResponse.json({ success: true, flows: [] });
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. GUARDAR FLUJO / CAMINITO DE CAMPAÑA
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "save_flow") {
      const { flow } = body;
      if (!flow || !flow.id) {
        return NextResponse.json({ error: "Datos de flujo incompletos" }, { status: 400 });
      }

      let flows: any[] = [];
      try {
        const { data: file } = await supabase.storage
          .from("product-images")
          .download("_system/weavy_flows.json");
        if (file) flows = JSON.parse((await file.text()) || "[]");
      } catch {}

      const idx = flows.findIndex((f: any) => f.id === flow.id);
      flow.updatedAt = new Date().toISOString();
      if (!flow.createdAt) flow.createdAt = flow.updatedAt;

      if (idx !== -1) {
        flows[idx] = flow;
      } else {
        flows.unshift(flow);
      }

      await supabase.storage
        .from("product-images")
        .upload("_system/weavy_flows.json", Buffer.from(JSON.stringify(flows, null, 2)), {
          contentType: "application/json",
          upsert: true,
        });

      return NextResponse.json({ success: true, flow });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. ELIMINAR FLUJO
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "delete_flow") {
      const { flowId } = body;
      let flows: any[] = [];
      try {
        const { data: file } = await supabase.storage
          .from("product-images")
          .download("_system/weavy_flows.json");
        if (file) flows = JSON.parse((await file.text()) || "[]");
      } catch {}

      flows = flows.filter((f: any) => f.id !== flowId);
      await supabase.storage
        .from("product-images")
        .upload("_system/weavy_flows.json", Buffer.from(JSON.stringify(flows, null, 2)), {
          contentType: "application/json",
          upsert: true,
        });

      return NextResponse.json({ success: true, flowId });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. GENERAR PROMPT COMERCIAL CON GEMINI A PARTIR DEL PRODUCTO
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "generate_commercial_prompt") {
      const { productTitle, category, currentImage, style, ratio, goal } = body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === "TU_API_KEY_AQUI") {
        return NextResponse.json({
          success: true,
          promptText: `Commercial luxury studio advertisement photography for ${productTitle || "Exclusive Product"}, cinematic 8k, photorealistic product staging, soft lighting.`,
        });
      }

      const promptReq = `Actúa como un Director de Arte y Prompt Engineer de alto nivel publicitario (Apple, Nike, Vogue).
Crea un prompt en INGLÉS optimizado para generación de imagen/video fotorrealista de este producto:
- Producto: ${productTitle || "Producto comercial"}
- Categoría: ${category || "General"}
- Estilo Deseado: ${style || "Cinematográfico comercial"}
- Formato: ${ratio || "9:16"}
- Objetivo: ${goal || "Comercial impactante para redes sociales"}

REGLAS OBLIGATORIAS:
1. El prompt debe estar en INGLÉS (los modelos de difusión y video responden mejor en inglés).
2. Detalla con precisión: Iluminación (golden hour, soft studio, volumetric fog, rim light), composición de cámara (close-up, low angle, slow push-in, 360 orbit), superficie y materiales de fondo (marble pedestal, wooden desk, modern minimalist living room), y atmósfera.
3. Devuelve ÚNICAMENTE un JSON con:
{
  "promptText": "El prompt en inglés aquí...",
  "negativePrompt": "blurry, distorted, low resolution, noisy, watermark, deformed text",
  "cameraMotion": "slow cinematic push-in tracking shot",
  "lighting": "warm diffused studio light with subtle reflections"
}`;

      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptReq }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
          }
        );

        if (geminiRes.ok) {
          const gemData = await geminiRes.json();
          const text = gemData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            return NextResponse.json({ success: true, ...parsed });
          }
        }
      } catch (e: any) {
        console.warn("Fallo generando prompt asistido:", e);
      }

      return NextResponse.json({
        success: true,
        promptText: `Commercial advertising studio hero shot for ${productTitle}, high-end aesthetic, sharp focus, 8k resolution.`,
        negativePrompt: "blurry, distorted, low quality",
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ──────────────────────────────────────────────────────────────────────────
    // 5. GENERAR IMAGEN PUBLICITARIA (LOCAL RTX 4070 AUTO-DETECT O GEMINI NUBE)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "generate_image") {
      const { promptText, sourceImageUrl, aspectRatio } = body;
      const apiKey = process.env.GEMINI_API_KEY;

      // 5.1 INTENTO PRIORITARIO: ESTACIÓN LOCAL RTX 4070 (SD WEBUI / FORGE / COMFYUI)
      // Si tienes Stability Matrix / Forge corriendo en tu máquina, responde en localhost:7860
      try {
        const localDimensions = aspectRatio === "9:16" 
          ? { width: 576, height: 1024 }
          : aspectRatio === "16:9"
          ? { width: 1024, height: 576 }
          : { width: 768, height: 768 };

        const localRes = await fetch("http://127.0.0.1:7860/sdapi/v1/txt2img", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: promptText + ", 8k, photorealistic, cinematic studio product photography",
            negative_prompt: "blurry, low quality, distorted, watermark",
            width: localDimensions.width,
            height: localDimensions.height,
            steps: 25,
            cfg_scale: 7,
          }),
          // Timeout rápido por si el servidor local está apagado
          signal: AbortSignal.timeout(3000),
        }).catch(() => null);

        if (localRes && localRes.ok) {
          const localData = await localRes.json();
          const firstImageB64 = localData.images?.[0];
          if (firstImageB64) {
            const fullB64 = `data:image/png;base64,${firstImageB64}`;
            // Guardar en storage para tener URL limpia
            try {
              const buffer = Buffer.from(firstImageB64, "base64");
              const fileName = `weavy/local_rtx_${Date.now()}.png`;
              await supabase.storage.from("product-images").upload(fileName, buffer, {
                contentType: "image/png",
                upsert: true,
              });
              const { data: pubData } = supabase.storage.from("product-images").getPublicUrl(fileName);
              return NextResponse.json({
                success: true,
                imageUrl: pubData?.publicUrl || fullB64,
                engine: "local_rtx_4070",
              });
            } catch {
              return NextResponse.json({
                success: true,
                imageUrl: fullB64,
                engine: "local_rtx_4070",
              });
            }
          }
        }
      } catch (localErr) {
        // Servidor local no activo, pasar al fallback de nube
      }

      if (!apiKey || apiKey === "TU_API_KEY_AQUI") {
        return NextResponse.json(
          { error: "GEMINI_API_KEY no configurada y servidor local RTX no detectado." },
          { status: 400 }
        );
      }

      // 5.2 INTENTO SECUNDARIO: GEMINI CLOUD
      const imageModels = [
        "gemini-2.5-flash-image",
        "gemini-3.1-flash-image",
        "gemini-3.1-flash-lite-image",
        "gemini-3-pro-image",
      ];

      let generatedBase64: string | null = null;
      let lastErrMsg = "";
      let quotaExceeded = false;

      for (const model of imageModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const parts: any[] = [{ text: promptText }];

          if (sourceImageUrl && sourceImageUrl.startsWith('data:image/')) {
            const match = sourceImageUrl.match(/^data:(image\/\w+);base64,(.*)$/);
            if (match) {
              parts.unshift({
                inlineData: {
                  mimeType: match[1],
                  data: match[2],
                },
              });
            }
          }

          const payload = {
            contents: [{ parts }],
            generationConfig: {
              responseModalities: ["image", "text"],
            },
          };

          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            const data = await res.json();
            const part = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData || p.inline_data);
            const inline = part?.inlineData || part?.inline_data;
            if (inline?.data) {
              const mime = inline.mimeType || inline.mime_type || "image/jpeg";
              generatedBase64 = `data:${mime};base64,${inline.data}`;
              break;
            }
          } else {
            const errJson = await res.json().catch(() => ({}));
            const msg = errJson.error?.message || `HTTP ${res.status}`;
            lastErrMsg = msg;
            if (res.status === 429 || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Free Tier")) {
              quotaExceeded = true;
            }
          }
        } catch (e: any) {
          lastErrMsg = e.message;
        }
      }

      // Si el modelo devolvió base64, guardarlo en Storage de FoxDrop para tener URL permanente
      if (generatedBase64) {
        try {
          const base64Data = generatedBase64.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          const fileName = `weavy/gen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;

          await supabase.storage.from("product-images").upload(fileName, buffer, {
            contentType: "image/jpeg",
            upsert: true,
          });

          const { data: pubData } = supabase.storage.from("product-images").getPublicUrl(fileName);
          return NextResponse.json({
            success: true,
            imageUrl: pubData?.publicUrl || generatedBase64,
          });
        } catch {
          return NextResponse.json({
            success: true,
            imageUrl: generatedBase64,
          });
        }
      }

      // Mensaje pedagógico si la cuenta de Gemini es Free Tier sin cuota para generación de imágenes sintéticas
      if (quotaExceeded) {
        return NextResponse.json(
          {
            error: "Tu API Key de Gemini está en Free Tier (Límite: 0 peticiones/día para generación de imágenes '*-image'). Para habilitar la renderización de imágenes IA directo en Google AI Studio, tu proyecto requiere activar Billing (Pay-as-you-go). Mientras tanto, puedes usar la caja '+ Foto PC' o seleccionar fotos del catálogo para crear tus caminitos publicitarios.",
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: `No se pudo generar la imagen con los modelos disponibles: ${lastErrMsg || "Intenta con otro prompt"}`,
        },
        { status: 500 }
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. GENERAR VIDEO (LOCAL RTX 4070 AUTO-DETECT O GOOGLE VEO)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "generate_video") {
      const { promptText, sourceImageUrl, aspectRatio, durationSec } = body;
      const apiKey = process.env.GEMINI_API_KEY;

      // 6.1 INTENTO PRIORITARIO: ANIMATEDIFF LOCAL EN RTX 4070
      try {
        const localDimensions = aspectRatio === "9:16" 
          ? { width: 448, height: 768 }
          : aspectRatio === "16:9"
          ? { width: 768, height: 448 }
          : { width: 512, height: 512 };

        const localRes = await fetch("http://127.0.0.1:7860/sdapi/v1/txt2img", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: promptText + ", cinematic commercial video, dynamic lighting, 8k",
            negative_prompt: "static, blurry, low quality, distorted",
            width: localDimensions.width,
            height: localDimensions.height,
            steps: 20,
            cfg_scale: 7,
            alwayson_scripts: {
              AnimateDiff: {
                args: [
                  {
                    model: "mm_sdxl_v10_beta.safetensors",
                    enable: true,
                    video_length: 16,
                    fps: 8,
                    loop_number: 0,
                    format: ["GIF", "MP4"],
                  },
                ],
              },
            },
          }),
          signal: AbortSignal.timeout(60000),
        }).catch(() => null);

        if (localRes && localRes.ok) {
          const localData = await localRes.json();
          const firstMediaB64 = localData.images?.[0];
          if (firstMediaB64) {
            const isGif = firstMediaB64.startsWith("R0lGOD");
            const mime = isGif ? "image/gif" : "video/mp4";
            const ext = isGif ? "gif" : "mp4";
            const fullB64 = `data:${mime};base64,${firstMediaB64}`;

            try {
              const buffer = Buffer.from(firstMediaB64, "base64");
              const fileName = `weavy/local_video_${Date.now()}.${ext}`;
              await supabase.storage.from("product-images").upload(fileName, buffer, {
                contentType: mime,
                upsert: true,
              });
              const { data: pubData } = supabase.storage.from("product-images").getPublicUrl(fileName);
              return NextResponse.json({
                success: true,
                videoUrl: pubData?.publicUrl || fullB64,
                engine: "local_rtx_4070_animatediff",
              });
            } catch {
              return NextResponse.json({
                success: true,
                videoUrl: fullB64,
                engine: "local_rtx_4070_animatediff",
              });
            }
          }
        }
      } catch (localVidErr) {
        // Fallback a nube
      }

      if (!apiKey || apiKey === "TU_API_KEY_AQUI") {
        return NextResponse.json(
          { error: "GEMINI_API_KEY no configurada y estación local no disponible para video." },
          { status: 400 }
        );
      }

      // Intento con Google Veo / Gemini Omni Flash Preview
      const videoModels = [
        "veo-3.1-fast-generate-preview",
        "veo-3.1-generate-preview",
        "gemini-omni-flash-preview",
      ];

      for (const vModel of videoModels) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${vModel}:predict?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                instances: [
                  {
                    prompt: promptText,
                    ...(sourceImageUrl ? { image: { uri: sourceImageUrl } } : {}),
                  },
                ],
                parameters: {
                  aspectRatio: aspectRatio || "9:16",
                  durationSeconds: durationSec || 5,
                },
              }),
            }
          );

          if (res.ok) {
            const data = await res.json();
            const videoUrl = data.predictions?.[0]?.videoUri || data.predictions?.[0]?.url;
            if (videoUrl) {
              return NextResponse.json({ success: true, videoUrl });
            }
          }
        } catch (vErr) {
          console.warn(`Error llamando a modelo de video ${vModel}:`, vErr);
        }
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "El motor de Google Veo requiere acceso a billing activo o permisos de preview en tu cuenta Google Cloud. Mientras tanto, puedes usar los clips HD oficiales del catálogo o generar imágenes fotorrealistas al instante con tu RTX 4070.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (err: any) {
    console.error("Error en /api/admin/weavy:", err);
    return NextResponse.json({ error: err.message || "Error interno del servidor" }, { status: 500 });
  }
}
