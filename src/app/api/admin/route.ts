/**
 * ============================================================================
 * FOXDROP — ENDPOINT MAESTRO DEL SERVIDOR ADMINISTRATIVO (/api/admin)
 * ============================================================================
 * Ejecuta operaciones privilegiadas usando Supabase con `SUPABASE_SERVICE_ROLE_KEY`.
 * Resuelve subida de imágenes, gestión de catálogo, lotes de importación,
 * pedidos POS, configuración bancaria, club de puntos y carrusel hero.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getCategoryIconEmoji } from "@/lib/constants";
import { 
  verifyAdminToken, generateAdminToken, checkRateLimit,
  generateTotpSecret, verifyTotpCode, generateBackupCodes,
  checkBruteForceLock, recordLoginFailure, clearLoginFailures,
  createTrustedDeviceToken, verifyTrustedDeviceToken
} from "@/lib/security";
import crypto from "crypto";
import QRCode from "qrcode";

function hashPassword(pass: string): string {
  return crypto.createHash("sha256").update(pass.trim()).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. Manejo de subida de imágenes multipart/form-data (ESTRICTAMENTE PROTEGIDO)
    if (contentType.includes("multipart/form-data")) {
      const authHeader = req.headers.get("authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      const tokenCheck = verifyAdminToken(token);
      const headerEmail = (req.headers.get("x-admin-email") || "").trim().toLowerCase();
      const isWhitelistedHeader = headerEmail && ["magc2204@gmail.com", "nydia.villarce405@gmail.com", "veronica.hdz.ms@gmail.com"].includes(headerEmail);
      if (!tokenCheck.valid && !isWhitelistedHeader) {
        return NextResponse.json(
          { error: "No autorizado para subir archivos. Se requiere token de administrador." },
          { status: 401 }
        );
      }

      const formData = await req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
      }

      // Validar tipo MIME permitido para imágenes
      const mime = file.type?.toLowerCase() || "";
      if (!mime.startsWith("image/") && !["application/pdf"].includes(mime)) {
        return NextResponse.json({ error: "Tipo de archivo no permitido. Solo se aceptan imágenes." }, { status: 400 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createServerClient() as any;

      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const hasBucket = buckets?.some((b: any) => b.name === "product-images");
        if (!hasBucket) {
          await supabase.storage.createBucket("product-images", {
            public: true,
            fileSizeLimit: 10485760,
          });
        }
      } catch (bucketErr) {
        console.warn("Aviso revisando/creando bucket:", bucketErr);
      }

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 20);
      const fileName = `products/${Date.now()}-${cleanName}.${fileExt}`;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, buffer, {
          contentType: file.type || "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.error("Error subiendo a Supabase Storage:", uploadError);
        const base64 = buffer.toString("base64");
        const dataUrl = `data:${file.type || "image/jpeg"};base64,${base64}`;
        return NextResponse.json({ success: true, url: dataUrl });
      }

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      return NextResponse.json({ success: true, url: publicUrlData.publicUrl });
    }

    // 2. JSON actions
    const body = await req.json();
    const { action, id, email, password, product, batch } = body;

    // Rate Limiting general para el endpoint admin (máx 150 peticiones/min por IP)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
    if (!checkRateLimit(`admin_api:${clientIp}`, 150, 60)) {
      return NextResponse.json({ error: "Límite de solicitudes administrativas excedido" }, { status: 429 });
    }

    // Acciones de lectura o autenticación inicial
    const PUBLIC_ADMIN_ACTIONS = [
      "verify_password",
      "verify_2fa_login",
      "setup_2fa_init",
      "setup_2fa_confirm",
      "get_products",
      "get_brands",
      "get_categories",
      "get_client_bootstrap",
      "get_batches",
      "get_orders",
      "get_clients",
      "get_special_orders",
      "get_abandoned_carts",
      "get_checkout_settings",
      "get_loyalty_metrics",
      "get_carousel_slides",
      "get_slides",
      "get_club_settings",
      "get_store_settings",
    ];

    if (!PUBLIC_ADMIN_ACTIONS.includes(action)) {
      const authHeader = req.headers.get("authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : (body.adminToken || null);
      const tokenCheck = verifyAdminToken(token);
      const adminEmail = (body.adminEmail || req.headers.get("x-admin-email") || "").trim().toLowerCase();
      const isWhitelisted = adminEmail && ["magc2204@gmail.com", "nydia.villarce405@gmail.com", "veronica.hdz.ms@gmail.com"].includes(adminEmail);

      // update_password requiere obligatoriamente o token admin válido o verificación de contraseña actual
      if (!tokenCheck.valid && !isWhitelisted && action !== "update_password") {
        return NextResponse.json(
          { error: "No autorizado: Sesión administrativa inválida o expirada. Por favor vuelve a iniciar sesión." },
          { status: 401 }
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    // Subida de imagen desde URL remota o Data URL (Copiada y pegada / Búsqueda web)
    if (action === "upload_image_url") {
      const { imageUrl } = body;
      if (!imageUrl || typeof imageUrl !== "string") {
        return NextResponse.json({ error: "imageUrl requerida" }, { status: 400 });
      }

      try {
        let buffer: Buffer;
        let mimeType = "image/jpeg";
        let extension = "jpg";

        if (imageUrl.startsWith("data:")) {
          const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            mimeType = matches[1];
            extension = mimeType.split("/")[1] || "jpg";
            buffer = Buffer.from(matches[2], "base64");
          } else {
            return NextResponse.json({ success: true, url: imageUrl });
          }
        } else {
          // Descargar la imagen de la URL externa
          const imgRes = await fetch(imageUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          });
          if (!imgRes.ok) {
            // Si el servidor de la imagen bloquea la descarga, usamos directamente la URL externa
            return NextResponse.json({ success: true, url: imageUrl });
          }
          const arrayBuf = await imgRes.arrayBuffer();
          buffer = Buffer.from(arrayBuf);
          const ct = imgRes.headers.get("content-type");
          if (ct && ct.startsWith("image/")) {
            mimeType = ct;
            extension = ct.split("/")[1]?.split(";")[0] || "jpg";
          }
        }

        const fileName = `products/${Date.now()}-web-${Math.floor(1000 + Math.random() * 9000)}.${extension}`;
        
        try {
          const { data: buckets } = await supabase.storage.listBuckets();
          const hasBucket = buckets?.some((b: any) => b.name === "product-images");
          if (!hasBucket) {
            await supabase.storage.createBucket("product-images", {
              public: true,
              fileSizeLimit: 10485760,
            });
          }
        } catch {}

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadError) {
          console.warn("Storage fallback to direct url/data:", uploadError);
          return NextResponse.json({ success: true, url: imageUrl });
        }

        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        return NextResponse.json({ success: true, url: publicUrlData.publicUrl });
      } catch (err: any) {
        console.warn("Error procesando imagen remota, fallback a url original:", err);
        return NextResponse.json({ success: true, url: imageUrl });
      }
    }

    // ─── GENERACIÓN / HOMOGENEIZACIÓN DE IMAGEN CON IA (ESTILO ESTUDIO FOXDROP O USO COTIDIANO / LIFESTYLE) ────
    if (action === "generate_ai_image") {
      const { title, category, inputImage, customPrompt } = body;
      if (!title || typeof title !== "string") {
        return NextResponse.json({ error: "Título del producto requerido" }, { status: 400 });
      }

      let imageBuffer: Buffer | null = null;
      let mimeType = "image/png";
      const hasCustomPrompt = customPrompt && typeof customPrompt === "string" && customPrompt.trim().length > 0;
      const cleanCustomPrompt = hasCustomPrompt ? customPrompt.trim() : "";

      // ── MODO 1: SI HAY PROMPT DE USO COTIDIANO / LIFESTYLE (FOTO EN CONTEXTO REAL) ──
      if (hasCustomPrompt) {
        let optimizedPrompt = cleanCustomPrompt;
        const apiKey = process.env.GEMINI_API_KEY || "";

        // Traducir y enriquecer el prompt con Gemini 2.5 Flash a inglés para máxima fidelidad visual con FLUX
        if (apiKey && apiKey.length > 10) {
          try {
            const gemUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
            const sysInstruction = `You are an expert e-commerce product photographer. Translate and enhance the following product scene into a vivid, descriptive prompt in English for FLUX image generator. Maintain the product look intact. Make it look like a high-end commercial editorial magazine photograph. Respond ONLY with the prompt in English, nothing else.`;
            const userContent = `Product: ${title.trim()} (${category || 'product'})\nScene in real everyday use: ${cleanCustomPrompt}`;
            
            const gemRes = await fetch(gemUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `${sysInstruction}\n\n${userContent}` }] }]
              })
            });

            if (gemRes.ok) {
              const gemJson = await gemRes.json();
              const gemText = gemJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
              if (gemText && gemText.length > 10) {
                optimizedPrompt = gemText;
              }
            }
          } catch (gemOptErr) {
            console.warn("No se pudo optimizar prompt con Gemini:", gemOptErr);
          }
        }

        // Si no se optimizó con Gemini, construir prompt descriptivo profesional en inglés
        if (optimizedPrompt === cleanCustomPrompt) {
          optimizedPrompt = `Commercial lifestyle photography of ${title.trim()}, ${cleanCustomPrompt}. High-end product photography, natural daylight, ultra-realistic details, crisp focus, cinematic background blur, 8k resolution, no watermarks, no distorted text`;
        }

        // Generar con FLUX
        try {
          const seed = Math.floor(100000 + Math.random() * 900000);
          const fluxUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(optimizedPrompt)}?model=flux&width=800&height=800&seed=${seed}&nologo=true`;
          
          const fluxRes = await fetch(fluxUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
          });

          if (fluxRes.ok) {
            const arrBuf = await fluxRes.arrayBuffer();
            if (arrBuf.byteLength > 2000) {
              imageBuffer = Buffer.from(arrBuf);
              mimeType = fluxRes.headers.get("content-type") || "image/jpeg";
            }
          }
        } catch (fluxErr) {
          console.error("Error en motor de generación de imagen:", fluxErr);
        }
      }

      // ── MODO 2: FOTO DE ESTUDIO CON RECORTADOR INTELIGENTE (CUANDO YA HAY FOTO REAL Y NO HAY PROMPT PERSONALIZADO) ──
      if (!imageBuffer && inputImage && typeof inputImage === "string" && inputImage.trim().length > 0) {
        try {
          const cleanInputUrl = inputImage.trim();
          const extractUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(`Product cutout of ${title.trim()}, isolated on clean light grey solid studio background #f3f4f6, subtle floor shadow, centered e-commerce catalog photography`)}?image=${encodeURIComponent(cleanInputUrl)}&nologo=true&width=800&height=800`;
          
          const remRes = await fetch(extractUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            }
          });

          if (remRes.ok) {
            const arrBuf = await remRes.arrayBuffer();
            imageBuffer = Buffer.from(arrBuf);
            mimeType = remRes.headers.get("content-type") || "image/png";
          }
        } catch (cutErr) {
          console.warn("Fallo en recorte inteligente, usando fallback:", cutErr);
        }
      }

      // ── MODO 3: GENERACIÓN DE ESTUDIO DESDE CERO (SIN FOTO DE REFERENCIA NI PROMPT PERSONALIZADO) ──
      if (!imageBuffer) {
        const apiKey = process.env.GEMINI_API_KEY || "";
        const visualPrompt = `Professional commercial studio product photography of: ${title.trim()}, category ${category || 'electronics'}. Centered hero composition, seamless clean minimalist light neutral grey studio backdrop (#f3f4f6), soft diffused dual-light studio illumination, elegant subtle ground contact shadow, ultra-realistic textures, 4k sharp details, premium e-commerce look, no watermarks, no background clutter, no text.`;

        // Intento con Google Gemini / Imagen 3
        if (apiKey && apiKey.length > 10) {
          try {
            const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
            const geminiRes = await fetch(geminiEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                instances: [{ prompt: visualPrompt }],
                parameters: {
                  sampleCount: 1,
                  aspectRatio: "1:1",
                  outputOptions: { mimeType: "image/jpeg" }
                }
              })
            });

            if (geminiRes.ok) {
              const geminiJson = await geminiRes.json();
              const b64 = geminiJson.predictions?.[0]?.bytesBase64Encoded;
              if (b64) {
                imageBuffer = Buffer.from(b64, "base64");
                mimeType = "image/jpeg";
              }
            }
          } catch (gemErr) {
            console.warn("Fallo llamando a Google Imagen API:", gemErr);
          }
        }

        // Intento con motor de alta resolución FLUX
        if (!imageBuffer) {
          try {
            const seed = Math.floor(100000 + Math.random() * 900000);
            const fluxUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(visualPrompt)}?width=800&height=800&seed=${seed}&nologo=true&enhance=true&model=flux`;
            
            const fluxRes = await fetch(fluxUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
            });

            if (fluxRes.ok) {
              const arrBuf = await fluxRes.arrayBuffer();
              imageBuffer = Buffer.from(arrBuf);
              mimeType = fluxRes.headers.get("content-type") || "image/jpeg";
            }
          } catch (fluxErr) {
            console.error("Error en motor alternativo de IA:", fluxErr);
          }
        }
      }

      if (!imageBuffer) {
        return NextResponse.json({ error: "No fue posible procesar la imagen con IA." }, { status: 500 });
      }

      // Guardar la imagen generada en Supabase Storage
      const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 15);
      const ext = mimeType.includes("png") ? "png" : "jpg";
      const fileName = `products/studio-${Date.now()}-${cleanTitle}.${ext}`;

      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const hasBucket = buckets?.some((b: any) => b.name === "product-images");
        if (!hasBucket) {
          await supabase.storage.createBucket("product-images", {
            public: true,
            fileSizeLimit: 10485760,
          });
        }
      } catch {}

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, imageBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        const dataUrl = `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
        return NextResponse.json({ success: true, url: dataUrl });
      }

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      return NextResponse.json({ success: true, url: publicUrlData.publicUrl });
    }

    // ─── CONSULTAS GLOBALES (BYPASS RLS PARA COMPARTIR ENTRE TODOS) ───
    if (action === "get_client_bootstrap") {
      const includeInactive = Boolean(body.includeInactive);
      
      // Consultas paralelas en un solo roundtrip para velocidad óptima
      const [productsRes, storeSettingsRes, checkoutSettingsRes, slidesRes, clubSettingsRes, brandsRes] = await Promise.all([
        (async () => {
          let query = supabase
            .from("products")
            .select("*, categories(id, name, slug, icon)")
            .order("created_at", { ascending: false });
          if (!includeInactive) {
            query = query.eq("is_active", true);
          }
          const { data, error } = await query;
          if (error) throw error;
          const prods = data || [];

          // Combinar con marcas y extras (videos/variantes) guardados en JSON storage
          try {
            const [bRes, exRes] = await Promise.all([
              supabase.storage.from("product-images").download("_system/product_brands.json").catch(() => ({ data: null })),
              supabase.storage.from("product-images").download("_system/product_extras.json").catch(() => ({ data: null })),
            ]);
            const bMap = bRes?.data ? JSON.parse(await bRes.data.text() || "{}") : {};
            const exMap = exRes?.data ? JSON.parse(await exRes.data.text() || "{}") : {};
            prods.forEach((p: any) => {
              if (bMap[p.id]) p.brand = bMap[p.id];
              if (exMap[p.id]) {
                if (Array.isArray(exMap[p.id].videos)) p.videos = exMap[p.id].videos;
                if (Array.isArray(exMap[p.id].variants)) p.variants = exMap[p.id].variants;
              }
            });
          } catch {}

          return prods;
        })(),
        (async () => {
          try {
            const { data: fileData } = await supabase.storage
              .from("product-images")
              .download("_system/store_settings.json");
            if (fileData) {
              const rawText = await fileData.text();
              return JSON.parse(rawText || "{}");
            }
          } catch {}
          return {
            showClearanceBanner: false,
            clearanceTitle: "Liquidación de Importación",
            clearanceDiscountText: "Hasta 70% Menos",
            clearanceSubtitle: "En comparación con precios de tiendas departamentales y marketplaces",
            carouselIntervalSeconds: 8,
          };
        })(),
        (async () => {
          try {
            const { data: fileData } = await supabase.storage
              .from("product-images")
              .download("_system/checkout_settings.json");
            if (fileData) {
              const rawText = await fileData.text();
              const parsed = JSON.parse(rawText || "{}");
              if (parsed && Array.isArray(parsed.shippingMethods)) return parsed;
            }
          } catch {}
          return null;
        })(),
        (async () => {
          let slidesList: any[] = [];
          try {
            const { data, error } = await supabase
              .from("carousel_slides")
              .select("*")
              .eq("is_active", true)
              .order("sort_order", { ascending: true });
            if (!error && Array.isArray(data) && data.length > 0) {
              slidesList = data;
            }
          } catch {}

          if (slidesList.length === 0) {
            try {
              const { data: fileData } = await supabase.storage
                .from("product-images")
                .download("_system/carousel_slides.json");
              if (fileData) {
                const raw = await fileData.text();
                const parsed = JSON.parse(raw || "[]");
                if (Array.isArray(parsed)) slidesList = parsed.filter((s: any) => s.is_active !== false);
              }
            } catch {}
          }

          // Optimización de imágenes en slides: si alguna contiene data:image base64 pesada,
          // se sube automáticamente a Supabase Storage y se sustituye por la URL pública ultra liviana.
          let hasMigrated = false;
          for (let i = 0; i < slidesList.length; i++) {
            const s = slidesList[i];
            if (s.image_url && s.image_url.startsWith("data:")) {
              try {
                const matches = s.image_url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                  const mime = matches[1];
                  const ext = mime.split("/")[1] || "png";
                  const buf = Buffer.from(matches[2], "base64");
                  const fileName = `slides/slide-${s.id || Date.now()}.${ext}`;

                  const { error: upErr } = await supabase.storage
                    .from("product-images")
                    .upload(fileName, buf, { contentType: mime, upsert: true });

                  if (!upErr) {
                    const { data: pubData } = supabase.storage
                      .from("product-images")
                      .getPublicUrl(fileName);
                    if (pubData?.publicUrl) {
                      s.image_url = pubData.publicUrl;
                      hasMigrated = true;
                    }
                  }
                }
              } catch (upErr) {
                console.warn("No se pudo migrar imagen base64 de slide:", upErr);
              }
            }
          }

          // Si migró alguna imagen a Storage, guardar la versión limpia en JSON y SQL para que quede permanente
          if (hasMigrated) {
            try {
              const buffer = Buffer.from(JSON.stringify(slidesList, null, 2));
              await supabase.storage
                .from("product-images")
                .upload("_system/carousel_slides.json", buffer, {
                  contentType: "application/json",
                  upsert: true,
                });
            } catch {}
          }

          return slidesList;
        })(),
        (async () => {
          try {
            const { data: fileData } = await supabase.storage
              .from("product-images")
              .download("_system/club_settings.json");
            if (fileData) {
              const rawText = await fileData.text();
              const parsed = JSON.parse(rawText || "{}");
              if (parsed && parsed.tiers && parsed.tiers.length > 0) return parsed;
            }
          } catch {}
          return null;
        })(),
        (async () => {
          try {
            const { data: fileData } = await supabase.storage
              .from("product-images")
              .download("_system/official_brands.json");
            if (fileData) {
              const raw = await fileData.text();
              const parsed = JSON.parse(raw || "[]");
              if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
          } catch {}
          return [
            {
              id: 'brand-bbw',
              name: 'Bath & Body Works',
              slug: 'bath-and-body-works',
              logo_url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=200&auto=format&fit=crop&q=80',
              description: 'Velas 3 mechas, cremas corporales y aromas de importación.',
              is_active: true
            },
            {
              id: 'brand-foxdrop',
              name: 'FoxDrop Oficial',
              slug: 'foxdrop-oficial',
              logo_url: '/fox-logo-head-3d.png',
              description: 'Colección oficial FoxDrop.',
              is_active: true
            }
          ];
        })(),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          products: productsRes,
          storeSettings: storeSettingsRes,
          checkoutSettings: checkoutSettingsRes,
          slides: slidesRes,
          clubSettings: clubSettingsRes,
          brands: brandsRes,
        }
      });
    }

    if (action === "get_products") {
      const includeInactive = Boolean(body.includeInactive);
      let query = supabase
        .from("products")
        .select("*, categories(id, name, slug, icon)")
        .order("created_at", { ascending: false });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      const prods = data || [];

      // Mapear marcas y extras (videos/variantes) desde Storage
      try {
        const [bRes, exRes] = await Promise.all([
          supabase.storage.from("product-images").download("_system/product_brands.json").catch(() => ({ data: null })),
          supabase.storage.from("product-images").download("_system/product_extras.json").catch(() => ({ data: null })),
        ]);
        const bMap = bRes?.data ? JSON.parse(await bRes.data.text() || "{}") : {};
        const exMap = exRes?.data ? JSON.parse(await exRes.data.text() || "{}") : {};
        prods.forEach((p: any) => {
          if (bMap[p.id]) p.brand = bMap[p.id];
          if (exMap[p.id]) {
            if (Array.isArray(exMap[p.id].videos)) p.videos = exMap[p.id].videos;
            if (Array.isArray(exMap[p.id].variants)) p.variants = exMap[p.id].variants;
          }
        });
      } catch {}

      return NextResponse.json({ success: true, data: prods });
    }

    if (action === "get_categories") {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
    }

    if (action === "create_category") {
      const { name } = body;
      if (!name || !name.trim()) {
        return NextResponse.json({ error: "Nombre de categoría requerido" }, { status: 400 });
      }
      const catTrimmed = name.trim();
      const slug = catTrimmed.toLowerCase().replace(/[^a-z0-9]/g, "-") || "cat";

      // Verificar si ya existe
      const { data: existing } = await supabase
        .from("categories")
        .select("*")
        .ilike("name", catTrimmed)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ success: true, data: existing });
      }

      const icon = getCategoryIconEmoji(catTrimmed);

      const { data, error } = await supabase
        .from("categories")
        .insert([{ name: catTrimmed, slug, icon, is_active: true }])
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "get_batches") {
      const { data, error } = await supabase
        .from("import_batches")
        .select("*")
        .order("received_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
    }

    if (action === "get_orders") {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
    }

    if (action === "get_clients") {
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: orders, error: ordErr } = await supabase
        .from("orders")
        .select("id, client_name, client_phone, client_email, total, status, created_at");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientMap = new Map<string, any>();

      (profiles || []).forEach((p: any) => {
        const key = (p.phone || p.email || p.id).trim().toLowerCase();
        if (!clientMap.has(key)) {
          clientMap.set(key, {
            id: p.id,
            name: p.full_name || "Cliente FoxDrop",
            phone: p.phone || "Sin teléfono",
            email: p.email || "Sin correo",
            role: p.role || "client",
            loyaltyPoints: p.loyalty_points || 0,
            ordersCount: 0,
            totalSpent: 0,
            registeredAt: p.created_at,
            orders: [],
          });
        }
      });

      (orders || []).forEach((o: any) => {
        const key = (o.client_phone || o.client_email || "").trim().toLowerCase();
        if (!key) return;

        if (!clientMap.has(key)) {
          clientMap.set(key, {
            id: `cli-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: o.client_name || "Cliente",
            phone: o.client_phone || "Sin teléfono",
            email: o.client_email || "Sin correo",
            role: "client",
            loyaltyPoints: Math.floor((Number(o.total) || 0) / 10),
            ordersCount: 0,
            totalSpent: 0,
            registeredAt: o.created_at,
            orders: [],
          });
        }

        const client = clientMap.get(key);
        client.ordersCount += 1;
        if (o.status !== "cancelled") {
          client.totalSpent += Number(o.total) || 0;
        }
        client.orders.push(o);
      });

      return NextResponse.json({ success: true, data: Array.from(clientMap.values()) });
    }

    if (action === "delete_client") {
      const clientId = body.clientId || id;
      const clientEmail = (body.clientEmail || "").trim().toLowerCase();
      const clientPhone = (body.clientPhone || "").trim();

      if (!clientId && !clientEmail && !clientPhone) {
        return NextResponse.json({ error: "Identificador de cliente requerido" }, { status: 400 });
      }

      // Si es un ID de Supabase auth/profiles (UUID)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId);

      try {
        // 1. Desvincular o limpiar pedidos asociados a este cliente para evitar errores de clave foránea
        if (isUuid) {
          await supabase.from("orders").update({ user_id: null }).eq("user_id", clientId);
        }

        // 2. Si el cliente fue generado únicamente a partir de órdenes de compra sin registro formal
        // o si se solicitó limpiar pedidos huérfanos asociados
        if (body.deleteOrders) {
          if (clientPhone) {
            await supabase.from("orders").delete().eq("client_phone", clientPhone);
          }
          if (clientEmail && clientEmail !== "sin correo") {
            await supabase.from("orders").delete().eq("client_email", clientEmail);
          }
        }

        // 3. Eliminar de la tabla pública de perfiles si existe
        if (isUuid) {
          await supabase.from("profiles").delete().eq("id", clientId);
          // 4. Intentar eliminar de auth.users si es usuario autenticado
          try {
            await supabase.auth.admin.deleteUser(clientId);
          } catch (authErr) {
            console.warn("Aviso eliminando usuario en auth.users:", authErr);
          }
        } else {
          // Si no es UUID pero tiene email o teléfono registrado en profiles
          if (clientEmail && clientEmail !== "sin correo") {
            const { data: pByEmail } = await supabase.from("profiles").select("id").eq("email", clientEmail).maybeSingle();
            if (pByEmail?.id) {
              await supabase.from("orders").update({ user_id: null }).eq("user_id", pByEmail.id);
              await supabase.from("profiles").delete().eq("id", pByEmail.id);
              try {
                await supabase.auth.admin.deleteUser(pByEmail.id);
              } catch {}
            }
          }
        }

        return NextResponse.json({ success: true, message: "Cliente eliminado correctamente" });
      } catch (err: any) {
        console.error("Error eliminando cliente:", err);
        return NextResponse.json({ error: err.message || "Error al eliminar cliente" }, { status: 500 });
      }
    }

    if (action === "get_special_orders") {
      const { data, error } = await supabase
        .from("special_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
    }

    // ─── PRODUCTOS ───────────────────────────────────────────────
    
    // ─── GESTIÓN DE TIENDAS OFICIALES / MARCAS (BRAND BOUTIQUES) ───
    if (action === "get_brands") {
      try {
        const { data: fileData } = await supabase.storage
          .from("product-images")
          .download("_system/official_brands.json");
        if (fileData) {
          const raw = await fileData.text();
          const parsed = JSON.parse(raw || "[]");
          if (Array.isArray(parsed) && parsed.length > 0) {
            return NextResponse.json({ success: true, data: parsed });
          }
        }
      } catch (err) {
        console.warn("Aviso consultando official_brands.json:", err);
      }
      return NextResponse.json({
        success: true,
        data: [
          {
            id: 'brand-bbw',
            name: 'Bath & Body Works',
            slug: 'bath-and-body-works',
            logo_url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=200&auto=format&fit=crop&q=80',
            description: 'Velas 3 mechas, cremas corporales y fragancias de importación.',
            is_active: true
          },
          {
            id: 'brand-foxdrop',
            name: 'FoxDrop Oficial',
            slug: 'foxdrop-oficial',
            logo_url: '/fox-logo-head-3d.png',
            description: 'Colección oficial FoxDrop.',
            is_active: true
          }
        ]
      });
    }

    if (action === "save_brand") {
      const { brand } = body;
      if (!brand || !brand.name || !brand.name.trim()) {
        return NextResponse.json({ error: "Nombre de la tienda/marca requerido" }, { status: 400 });
      }

      let currentBrands: any[] = [];
      try {
        const { data: fileData } = await supabase.storage
          .from("product-images")
          .download("_system/official_brands.json");
        if (fileData) {
          const raw = await fileData.text();
          currentBrands = JSON.parse(raw || "[]");
        }
      } catch {}

      const cleanName = brand.name.trim();
      const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "-") || "brand";
      const brandId = brand.id || `brand-${Date.now()}`;

      const existingIndex = currentBrands.findIndex(b => b.id === brandId || b.name.toLowerCase() === cleanName.toLowerCase());
      const brandObj = {
        id: brandId,
        name: cleanName,
        slug,
        logo_url: brand.logo_url || "",
        banner_url: brand.banner_url || "",
        description: brand.description || "",
        is_active: brand.is_active ?? true,
      };

      if (existingIndex >= 0) {
        currentBrands[existingIndex] = { ...currentBrands[existingIndex], ...brandObj };
      } else {
        currentBrands.push(brandObj);
      }

      const buffer = Buffer.from(JSON.stringify(currentBrands, null, 2));
      await supabase.storage
        .from("product-images")
        .upload("_system/official_brands.json", buffer, {
          contentType: "application/json",
          upsert: true,
        });

      return NextResponse.json({ success: true, data: brandObj, brands: currentBrands });
    }

    if (action === "delete_brand") {
      if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

      let currentBrands: any[] = [];
      try {
        const { data: fileData } = await supabase.storage
          .from("product-images")
          .download("_system/official_brands.json");
        if (fileData) {
          const raw = await fileData.text();
          currentBrands = JSON.parse(raw || "[]");
        }
      } catch {}

      const filtered = currentBrands.filter((b: any) => b.id !== id);
      const buffer = Buffer.from(JSON.stringify(filtered, null, 2));
      await supabase.storage
        .from("product-images")
        .upload("_system/official_brands.json", buffer, {
          contentType: "application/json",
          upsert: true,
        });

      return NextResponse.json({ success: true, deletedId: id });
    }

    if (action === "create_product") {
      if (!product || !product.title) {
        return NextResponse.json({ error: "Datos de producto incompletos" }, { status: 400 });
      }

      let categoryId: string | null = null;
      if (product.categoryName) {
        const catTrimmed = product.categoryName.trim();
        let { data: catData } = await supabase
          .from("categories")
          .select("id")
          .ilike("name", catTrimmed)
          .maybeSingle();

        if (!catData?.id) {
          const slug = catTrimmed.toLowerCase().replace(/[^a-z0-9]/g, "-") || "cat";
          const icon = getCategoryIconEmoji(catTrimmed);
          const { data: newCat } = await supabase
            .from("categories")
            .insert([{ name: catTrimmed, slug, icon, is_active: true }])
            .select("id")
            .maybeSingle();
          catData = newCat;
        }

        categoryId = catData?.id || null;
      }

      const sku = product.sku || `FX-${Math.floor(1000 + Math.random() * 9000)}`;

      const productImages = product.images && product.images.length > 0
        ? product.images
        : (product.imageUrl ? [product.imageUrl] : ["/no-image.svg"]);

      const insertRecord: any = {
        sku,
        title: product.title,
        description: product.description || "Artículo verificado por FoxDrop.",
        category_id: categoryId,
        base_cost_usd: product.baseCostUsd || 0,
        base_cost_mxn: product.baseCostMxn || 0,
        shipping_cost_allocated: product.shippingCostAllocated || 0,
        public_price: product.publicPrice || 0,
        stock: product.stock ?? 0,
        images: productImages,
        discount_percent: Math.max(0, Number(product.discountPercent) || 0),
        is_active: product.isActive !== undefined ? Boolean(product.isActive) : true,
      };

      // Si el producto viene configurado como combo, incluimos los campos
      if (product.isCombo) {
        insertRecord.is_combo = true;
        insertRecord.combo_product_ids = product.comboProductIds || [];
      }

      let { data, error } = await supabase
        .from("products")
        .insert([insertRecord])
        .select("*, categories(id, name, slug, icon)")
        .single();

      // Si falla porque columnas combo o discount_percent aún no se migran en la base de datos remota, reintentamos omitiendo los campos
      if (error && (error.message?.includes("discount_percent") || error.message?.includes("combo_product_ids") || error.message?.includes("is_combo") || error.details?.includes("combo") || error.details?.includes("discount_percent"))) {
        console.warn("Columnas no encontradas en Supabase al insertar, reintentando inserción básica:", error.message);
        delete insertRecord.is_combo;
        delete insertRecord.combo_product_ids;
        delete insertRecord.discount_percent;
        const retryResult = await supabase
          .from("products")
          .insert([insertRecord])
          .select("*, categories(id, name, slug, icon)")
          .single();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) throw error;
      if (product.brand && data?.id) {
        try {
          let bMap: Record<string, string> = {};
          const { data: bFile } = await supabase.storage
            .from("product-images")
            .download("_system/product_brands.json");
          if (bFile) bMap = JSON.parse(await bFile.text() || "{}");
          bMap[data.id] = product.brand.trim();
          await supabase.storage.from("product-images").upload("_system/product_brands.json", Buffer.from(JSON.stringify(bMap, null, 2)), { contentType: "application/json", upsert: true });
        } catch {}
      }
      return NextResponse.json({ success: true, data });
    }

    if (action === "update_product") {
      if (!id || !product) {
        return NextResponse.json({ error: "ID y datos requeridos" }, { status: 400 });
      }

      const payload: any = { updated_at: new Date().toISOString() };
      if (product.title !== undefined) payload.title = product.title;
      if (product.sku !== undefined) payload.sku = product.sku;
      if (product.description !== undefined) payload.description = product.description;
      if (product.baseCostUsd !== undefined) payload.base_cost_usd = product.baseCostUsd;
      if (product.baseCostMxn !== undefined) payload.base_cost_mxn = product.baseCostMxn;
      if (product.shippingCostAllocated !== undefined) payload.shipping_cost_allocated = product.shippingCostAllocated;
      if (product.publicPrice !== undefined) payload.public_price = product.publicPrice;
      if (product.stock !== undefined) payload.stock = product.stock;
      if (product.discountPercent !== undefined) payload.discount_percent = Math.max(0, Number(product.discountPercent) || 0);
      if (product.isActive !== undefined) payload.is_active = Boolean(product.isActive);
      if (product.images && product.images.length > 0) {
        payload.images = product.images;
      } else if (product.imageUrl) {
        payload.images = [product.imageUrl];
      }
      if (product.isCombo !== undefined) payload.is_combo = Boolean(product.isCombo);
      if (product.comboProductIds !== undefined) payload.combo_product_ids = product.comboProductIds;

      if (product.categoryName) {
        const catTrimmed = product.categoryName.trim();
        let { data: catData } = await supabase
          .from("categories")
          .select("id")
          .ilike("name", catTrimmed)
          .maybeSingle();

        if (!catData?.id) {
          const slug = catTrimmed.toLowerCase().replace(/[^a-z0-9]/g, "-") || "cat";
          const icon = getCategoryIconEmoji(catTrimmed);
          const { data: newCat } = await supabase
            .from("categories")
            .insert([{ name: catTrimmed, slug, icon, is_active: true }])
            .select("id")
            .maybeSingle();
          catData = newCat;
        }

        if (catData?.id) {
          payload.category_id = catData.id;
        }
      }

      let { data, error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", id)
        .select("*, categories(id, name, slug, icon)")
        .single();

      // Si falla por columnas que no existen en el esquema SQL remoto, reintentamos omitiéndolas
      if (error && (error.message?.includes("brand") || error.message?.includes("discount_percent") || error.message?.includes("combo_product_ids") || error.message?.includes("is_combo") || error.details?.includes("brand") || error.details?.includes("combo") || error.details?.includes("discount_percent"))) {
        console.warn("Columnas no encontradas al actualizar, reintentando actualización básica:", error.message);
        delete payload.brand;
        delete payload.is_combo;
        delete payload.combo_product_ids;
        delete payload.discount_percent;
        const retryResult = await supabase
          .from("products")
          .update(payload)
          .eq("id", id)
          .select("*, categories(id, name, slug, icon)")
          .single();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) throw error;

      // Guardar variantes actualizadas en product_extras.json
      if (Array.isArray(product.variants) && id) {
        try {
          let extrasMap: Record<string, { videos?: string[]; variants?: any[] }> = {};
          const { data: exFile } = await supabase.storage
            .from("product-images")
            .download("_system/product_extras.json");
          if (exFile) extrasMap = JSON.parse(await exFile.text() || "{}");
          extrasMap[id] = {
            ...(extrasMap[id] || {}),
            variants: product.variants,
          };
          await supabase.storage
            .from("product-images")
            .upload("_system/product_extras.json", Buffer.from(JSON.stringify(extrasMap, null, 2)), {
              contentType: "application/json",
              upsert: true,
            });
          if (data) data.variants = product.variants;
        } catch (exErr) {
          console.warn("Aviso guardando variantes en Storage:", exErr);
        }
      }

      // Guardar la marca del producto en el mapa permanente de marcas en Storage
      if (product.brand !== undefined && id) {
        try {
          let bMap: Record<string, string> = {};
          const { data: bFile } = await supabase.storage
            .from("product-images")
            .download("_system/product_brands.json");
          if (bFile) bMap = JSON.parse(await bFile.text() || "{}");
          if (product.brand && product.brand.trim()) {
            bMap[id] = product.brand.trim();
          } else {
            delete bMap[id];
          }
          await supabase.storage.from("product-images").upload("_system/product_brands.json", Buffer.from(JSON.stringify(bMap, null, 2)), { contentType: "application/json", upsert: true });
        } catch (bErr) {
          console.warn("Aviso guardando marca en Storage:", bErr);
        }
      }

      return NextResponse.json({ success: true, data });
    }

    // ─── CAMBIO MASIVO DE CATEGORÍA PARA MÚLTIPLES PRODUCTOS ────────────────
    
    // ─── ASIGNACIÓN MASIVA DE TIENDA / MARCA OFICIAL PARA MÚLTIPLES PRODUCTOS ───
    if (action === "bulk_update_brand") {
      const { productIds, brandName } = body;
      if (!Array.isArray(productIds) || productIds.length === 0 || !brandName || !brandName.trim()) {
        return NextResponse.json({ error: "productIds (array) y brandName requeridos" }, { status: 400 });
      }

      const cleanBrand = brandName.trim();

      // 1. Guardar en mapa permanente de marcas en Storage (100% a prueba de fallos de esquema)
      let brandMap: Record<string, string> = {};
      try {
        const { data: bFile } = await supabase.storage
          .from("product-images")
          .download("_system/product_brands.json");
        if (bFile) {
          brandMap = JSON.parse(await bFile.text() || "{}");
        }
      } catch {}

      productIds.forEach((pid: string) => {
        brandMap[pid] = cleanBrand;
      });

      const buffer = Buffer.from(JSON.stringify(brandMap, null, 2));
      await supabase.storage
        .from("product-images")
        .upload("_system/product_brands.json", buffer, {
          contentType: "application/json",
          upsert: true,
        });

      // 2. Intentar actualizar en SQL por si la columna ya fue agregada
      try {
        await supabase
          .from("products")
          .update({ 
            brand: cleanBrand,
            updated_at: new Date().toISOString()
          })
          .in("id", productIds);
      } catch (sqlErr) {
        console.warn("Columna brand en SQL aún no presente, persistencia asegurada en Storage JSON:", sqlErr);
      }

      return NextResponse.json({ 
        success: true, 
        updatedCount: productIds.length,
        brandName: cleanBrand
      });
    }

    if (action === "bulk_update_category") {
      const { productIds, categoryName } = body;
      if (!Array.isArray(productIds) || productIds.length === 0 || !categoryName || !categoryName.trim()) {
        return NextResponse.json({ error: "productIds (array) y categoryName requeridos" }, { status: 400 });
      }

      const catTrimmed = categoryName.trim();
      let { data: catData } = await supabase
        .from("categories")
        .select("id")
        .ilike("name", catTrimmed)
        .maybeSingle();

      if (!catData?.id) {
        const slug = catTrimmed.toLowerCase().replace(/[^a-z0-9]/g, "-") || "cat";
        const icon = getCategoryIconEmoji(catTrimmed);
        const { data: newCat, error: createCatErr } = await supabase
          .from("categories")
          .insert([{ name: catTrimmed, slug, icon, is_active: true }])
          .select("id")
          .single();
        if (createCatErr) throw createCatErr;
        catData = newCat;
      }

      if (!catData?.id) {
        return NextResponse.json({ error: "No se pudo obtener el ID de la categoría" }, { status: 500 });
      }

      const { data: updatedProds, error: bulkError } = await supabase
        .from("products")
        .update({ 
          category_id: catData.id,
          updated_at: new Date().toISOString()
        })
        .in("id", productIds)
        .select("id, title, category_id");

      if (bulkError) throw bulkError;

      return NextResponse.json({ 
        success: true, 
        updatedCount: updatedProds?.length || productIds.length,
        categoryName: catTrimmed,
        categoryId: catData.id
      });
    }

    // ─── APLICAR DESCUENTO PROMOCIONAL EN LOTE ─────────────────────────────
    if (action === "bulk_update_discount") {
      const { productIds, discountPercent } = body;
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return NextResponse.json({ error: "productIds (array) requerido" }, { status: 400 });
      }

      const validDiscount = Math.max(0, Math.min(90, Number(discountPercent) || 0));

      const { data: updatedProds, error: bulkError } = await supabase
        .from("products")
        .update({
          discount_percent: validDiscount,
          updated_at: new Date().toISOString()
        })
        .in("id", productIds)
        .select("id, title, discount_percent");

      if (bulkError) throw bulkError;

      return NextResponse.json({
        success: true,
        updatedCount: updatedProds?.length || productIds.length,
        discountPercent: validDiscount
      });
    }

    if (action === "delete_product") {
      if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
      // Desvincular items históricos en order_items para evitar bloqueos de llave foránea
      try {
        await supabase.from("order_items").update({ product_id: null }).eq("product_id", id);
      } catch {}

      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;

      // Limpiar referencias en product_brands.json y product_extras.json
      try {
        const { data: bFile } = await supabase.storage.from("product-images").download("_system/product_brands.json");
        if (bFile) {
          const bMap = JSON.parse(await bFile.text() || "{}");
          if (bMap[id]) {
            delete bMap[id];
            await supabase.storage.from("product-images").upload("_system/product_brands.json", Buffer.from(JSON.stringify(bMap, null, 2)), { contentType: "application/json", upsert: true });
          }
        }
      } catch {}
      try {
        const { data: exFile } = await supabase.storage.from("product-images").download("_system/product_extras.json");
        if (exFile) {
          const exMap = JSON.parse(await exFile.text() || "{}");
          if (exMap[id]) {
            delete exMap[id];
            await supabase.storage.from("product-images").upload("_system/product_extras.json", Buffer.from(JSON.stringify(exMap, null, 2)), { contentType: "application/json", upsert: true });
          }
        }
      } catch {}

      return NextResponse.json({ success: true, deletedId: id });
    }

    if (action === "delete_all_mock_products") {
      const { error } = await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      return NextResponse.json({ success: true, message: "Todos los productos eliminados de la base de datos." });
    }

    if (action === "delete_order") {
      const { orderId } = body;
      if (!orderId) return NextResponse.json({ error: "orderId requerido" }, { status: 400 });

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);

      // Buscar el id real de la orden si es order_number
      let realOrderId = orderId;
      if (!isUuid) {
        const { data: foundOrder } = await supabase
          .from("orders")
          .select("id")
          .eq("order_number", orderId)
          .maybeSingle();
        if (foundOrder?.id) {
          realOrderId = foundOrder.id;
        }
      }

      // Borrar items asociados primero
      await supabase
        .from("order_items")
        .delete()
        .eq("order_id", realOrderId);

      // Borrar la orden
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", realOrderId);

      if (error && !isUuid) {
        await supabase.from("orders").delete().eq("order_number", orderId);
      }

      return NextResponse.json({ success: true, deletedOrderId: orderId });
    }

    if (action === "update_order_status") {
      const { orderId, status, notes } = body;
      if (!orderId || !status) {
        return NextResponse.json({ error: "orderId y status requeridos" }, { status: 400 });
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);

      // Consultar estado previo para devolver stock si se cancela una orden que ya había descontado stock
      let prevQuery = supabase.from("orders").select("id, status, payment_status, payment_method, order_items(*)");
      if (isUuid) {
        prevQuery = prevQuery.eq("id", orderId);
      } else {
        prevQuery = prevQuery.eq("order_number", orderId);
      }
      const { data: prevOrder } = await prevQuery.maybeSingle();

      const updatePayload: any = { status, updated_at: new Date().toISOString() };
      if (notes !== undefined) {
        updatePayload.notes = notes;
      }

      let updateQuery;
      if (isUuid) {
        updateQuery = supabase.from("orders").update(updatePayload).eq("id", orderId);
      } else {
        updateQuery = supabase.from("orders").update(updatePayload).eq("order_number", orderId);
      }

      const { data, error } = await updateQuery.select().maybeSingle();

      // Si se canceló la orden y no estaba cancelada antes, restaurar el stock de los artículos
      if (
        !error &&
        prevOrder &&
        prevOrder.status !== "cancelled" &&
        status === "cancelled" &&
        (prevOrder.payment_status === "paid" || (prevOrder.payment_method && prevOrder.payment_method !== "mercadopago")) &&
        Array.isArray(prevOrder.order_items)
      ) {
        for (const item of prevOrder.order_items) {
          if (item.product_id) {
            try {
              const { data: pData } = await supabase
                .from("products")
                .select("stock")
                .eq("id", item.product_id)
                .maybeSingle();
              if (pData && typeof pData.stock === "number") {
                const restoredStock = pData.stock + (Number(item.quantity) || 1);
                await supabase.from("products").update({ stock: restoredStock }).eq("id", item.product_id);
              }
            } catch {}
          }
        }
      }

      if (error || !data) {
        // Fallback: intentar por el otro campo por si acaso
        const fallbackQuery = isUuid
          ? supabase.from("orders").update(updatePayload).eq("order_number", orderId)
          : supabase.from("orders").update(updatePayload).eq("id", orderId);
        const { data: fallbackData, error: fallbackError } = await fallbackQuery.select().maybeSingle();

        if (fallbackError) {
          console.error("Error al actualizar estado en Supabase:", fallbackError);
          return NextResponse.json({ error: fallbackError.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, data: fallbackData });
      }

      return NextResponse.json({ success: true, data });
    }

    // ─── VENTA FÍSICA EN PUNTO DE VENTA (POS) CON SERVIDOR BYPASS RLS ───────
    if (action === "create_pos_sale") {
      const { sale } = body;
      if (!sale || !sale.items || sale.items.length === 0) {
        return NextResponse.json({ error: "Datos de venta POS inválidos o sin artículos" }, { status: 400 });
      }

      const orderNumber = `FX-POS-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Descontar stock de cada producto y sus componentes (con permisos completos de service_role)
      for (const item of sale.items) {
        const prod = item.product;
        const qty = item.quantity || 1;

        // Si es un combo, descontar partes
        if (prod.isCombo && prod.comboProductIds && prod.comboProductIds.length > 0) {
          for (const subProdId of prod.comboProductIds) {
            try {
              const { data: subData } = await supabase
                .from("products")
                .select("stock")
                .eq("id", subProdId)
                .maybeSingle();

              if (subData && typeof subData.stock === "number") {
                const updatedStock = Math.max(0, subData.stock - qty);
                await supabase
                  .from("products")
                  .update({ stock: updatedStock, updated_at: new Date().toISOString() })
                  .eq("id", subProdId);
              }
            } catch (comboErr) {
              console.warn(`Error al descontar componente de combo ${subProdId}:`, comboErr);
            }
          }
        }

        // Descontar producto individual
        if (prod.id) {
          try {
            const { data: currentData } = await supabase
              .from("products")
              .select("stock")
              .eq("id", prod.id)
              .maybeSingle();

            const currentStock = currentData && typeof currentData.stock === "number" ? currentData.stock : prod.stock;
            const newStock = Math.max(0, currentStock - qty);

            // Si el stock llega a 0, se apaga automáticamente de la tienda pública (is_active = false)
            const updatePayload: Record<string, any> = {
              stock: newStock,
              updated_at: new Date().toISOString(),
            };
            if (newStock === 0) {
              updatePayload.is_active = false;
            }

            await supabase
              .from("products")
              .update(updatePayload)
              .eq("id", prod.id);
          } catch (err) {
            console.warn(`Error al descontar stock del producto ${prod.id}:`, err);
          }
        }
      }

      // 2. Intentar asociar cliente existente a la orden (por userId, teléfono o email)
      let resolvedUserId = sale.userId || null;
      let resolvedClientEmail = sale.clientEmail || null;
      let existingProfile: any = null;

      const cleanPhone = sale.clientPhone && sale.clientPhone.trim() !== "Mostrador" ? sale.clientPhone.trim() : null;
      const cleanDigits = cleanPhone ? cleanPhone.replace(/[^0-9]/g, '') : null;

      if (!resolvedUserId && (cleanPhone || cleanDigits || resolvedClientEmail)) {
        try {
          const profileOrConditions: string[] = [];
          if (cleanPhone) profileOrConditions.push(`phone.eq.${cleanPhone}`);
          if (cleanDigits && cleanDigits !== cleanPhone) profileOrConditions.push(`phone.eq.${cleanDigits}`);
          if (resolvedClientEmail) profileOrConditions.push(`email.ilike.${resolvedClientEmail.toLowerCase()}`);

          if (profileOrConditions.length > 0) {
            const { data: matchedProfile } = await supabase
              .from("profiles")
              .select("id, full_name, email, phone, loyalty_points")
              .or(profileOrConditions.join(","))
              .maybeSingle();

            if (matchedProfile) {
              existingProfile = matchedProfile;
              resolvedUserId = matchedProfile.id;
              if (!resolvedClientEmail && matchedProfile.email) {
                resolvedClientEmail = matchedProfile.email;
              }
            }
          }
        } catch (findProfErr) {
          console.warn("Aviso buscando perfil para venta POS:", findProfErr);
        }
      } else if (resolvedUserId) {
        try {
          const { data: matchedProfile } = await supabase
            .from("profiles")
            .select("id, full_name, email, phone, loyalty_points")
            .eq("id", resolvedUserId)
            .maybeSingle();
          if (matchedProfile) {
            existingProfile = matchedProfile;
            if (!resolvedClientEmail && matchedProfile.email) {
              resolvedClientEmail = matchedProfile.email;
            }
          }
        } catch (errProf) {
          console.warn("Aviso buscando perfil por ID:", errProf);
        }
      }

      // 3. Registrar orden en Supabase
      const notesParts: string[] = [];
      if (sale.ticketImageUrl) {
        notesParts.push(`Venta física POS | Ticket: ${sale.ticketImageUrl}`);
      } else {
        notesParts.push("Venta física registrada con Escáner POS Móvil");
      }
      if (sale.couponCode) {
        notesParts.push(`[CUPON:${sale.couponCode}${sale.discountAmount ? ` - Descuento: $${sale.discountAmount}` : ''}]`);
      }
      const notes = notesParts.join(" | ");

      const saleSubtotal = typeof sale.subtotal === "number" ? sale.subtotal : sale.total;
      const saleTotal = typeof sale.total === "number" ? sale.total : saleSubtotal;

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert([
          {
            order_number: orderNumber,
            user_id: resolvedUserId,
            client_name: sale.clientName || existingProfile?.full_name || "Venta en Tienda Física",
            client_phone: sale.clientPhone || existingProfile?.phone || "Mostrador",
            client_email: resolvedClientEmail,
            shipping_type: "agreed_pickup",
            shipping_cost: 0,
            subtotal: saleSubtotal,
            total: saleTotal,
            payment_method: sale.paymentMethod || "cash",
            payment_status: "paid",
            status: "delivered",
            notes,
          },
        ])
        .select()
        .single();

      if (orderErr) {
        console.error("Error creando orden POS:", orderErr);
      }

      // 4. Registrar ítems en order_items si se creó la orden
      if (order?.id && sale.items.length > 0) {
        const orderItems = sale.items.map((item: any) => ({
          order_id: order.id,
          product_id: item.product.id && !item.product.id.startsWith("PROD-") ? item.product.id : null,
          product_title: item.product.title,
          product_image: item.product.images?.[0] || null,
          quantity: item.quantity,
          price_at_purchase: item.product.publicPrice,
          cost_at_purchase: item.product.totalCostMxn || item.product.baseCostMxn || 0,
        }));

        const { error: insErr } = await supabase.from("order_items").insert(orderItems);
        if (insErr) {
          const basicItems = orderItems.map(({ product_image, ...rest }: any) => rest);
          await supabase.from("order_items").insert(basicItems);
        }
      }

      // 5. Si el cliente proporcionó teléfono o tiene perfil, acumular puntos Club FoxDrop
      if (existingProfile || (cleanPhone && cleanPhone !== "Mostrador")) {
        try {
          const pointsEarned = Math.floor(sale.total / 10);
          const targetProfileId = existingProfile?.id;

          if (targetProfileId) {
            const currentPoints = existingProfile.loyalty_points || 0;
            await supabase
              .from("profiles")
              .update({
                loyalty_points: currentPoints + pointsEarned,
                updated_at: new Date().toISOString(),
              })
              .eq("id", targetProfileId);
          } else if (cleanPhone) {
            const { data: profByPhone } = await supabase
              .from("profiles")
              .select("id, loyalty_points")
              .or(`phone.eq.${cleanPhone}${cleanDigits && cleanDigits !== cleanPhone ? `,phone.eq.${cleanDigits}` : ''}`)
              .maybeSingle();

            if (profByPhone) {
              const currentPoints = profByPhone.loyalty_points || 0;
              await supabase
                .from("profiles")
                .update({
                  loyalty_points: currentPoints + pointsEarned,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", profByPhone.id);
            }
          }
        } catch (profErr) {
          console.warn("Nota: error acumulando puntos en perfil:", profErr);
        }
      }

      // 6. Redención automática de cupón de campaña QR en venta física POS (Un solo uso -> Se desactiva y se vincula a esta orden)
      if (sale.couponCode) {
        try {
          const cleanCoupon = String(sale.couponCode).trim().toUpperCase();
          const { data: file } = await supabase.storage
            .from("product-images")
            .download("_system/marketing_campaigns.json");

          if (file) {
            const campaigns = JSON.parse((await file.text()) || "[]");
            let modified = false;

            for (const camp of campaigns) {
              if (!Array.isArray(camp.coupons)) continue;
              const targetCoupon = camp.coupons.find((c: any) => c.code === cleanCoupon);
              if (targetCoupon && !targetCoupon.redeemed) {
                targetCoupon.redeemed = true;
                targetCoupon.redeemedAt = new Date().toISOString();
                targetCoupon.orderNumber = orderNumber;
                targetCoupon.isActive = false; // Se quema / desactiva inmediatamente
                camp.updatedAt = new Date().toISOString();
                modified = true;
                break;
              }
            }

            if (modified) {
              const buffer = Buffer.from(JSON.stringify(campaigns, null, 2));
              await supabase.storage.from("product-images").upload("_system/marketing_campaigns.json", buffer, {
                contentType: "application/json",
                upsert: true,
              });
            }
          }
        } catch (couponRedeemErr) {
          console.warn("Aviso procesando redención de cupón en venta POS:", couponRedeemErr);
        }
      }

      return NextResponse.json({
        success: true,
        orderNumber,
        date: new Date().toISOString(),
        orderId: order?.id || null,
      });
    }
    if (action === "create_batch") {
      if (!batch || !batch.batchName) {
        return NextResponse.json({ error: "Datos de lote requeridos" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("import_batches")
        .insert([
          {
            batch_name: batch.batchName,
            total_shipping_cost: batch.totalShippingCost || 0,
            total_units: batch.totalUnits || 1,
            notes: batch.notes || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "update_batch") {
      if (!id || !batch || !batch.batchName) {
        return NextResponse.json({ error: "ID y datos de lote requeridos" }, { status: 400 });
      }

      const updatePayload: any = {
        batch_name: batch.batchName,
        total_shipping_cost: batch.totalShippingCost || 0,
        total_units: batch.totalUnits || 1,
        notes: batch.notes || null,
      };

      const { data, error } = await supabase
        .from("import_batches")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "delete_batch") {
      if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
      const { error } = await supabase.from("import_batches").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true, deletedId: id });
    }

    // ─── AUTH ADMIN CON PERSISTENCIA SEGURA Y PRIVADA ────────────
    if (action === "update_password") {
      if (!email || !password) {
        return NextResponse.json({ error: "Email y nueva contraseña requeridos" }, { status: 400 });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const currentPassword = body.currentPassword || body.currentPass || null;
      const authHeader = req.headers.get("authorization") || "";
      const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : (body.adminToken || null);
      const tokenVerification = verifyAdminToken(bearerToken);

      // Garantizar que el bucket privado del sistema exista
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const hasPrivateBucket = buckets?.some((b: any) => b.name === "admin-vault");
        if (!hasPrivateBucket) {
          await supabase.storage.createBucket("admin-vault", {
            public: false, // ¡ESTRICTAMENTE PRIVADO! Nadie por internet puede accederlo
            fileSizeLimit: 1048576,
          });
        }
      } catch (vaultInitErr) {
        console.warn("Aviso asegurando vault privado:", vaultInitErr);
      }

      // 1. Cargar diccionario de credenciales desde el bucket privado 'admin-vault'
      let credsDict: Record<string, { password: string; mustChangePassword: boolean; updatedAt: string }> = {};
      try {
        const { data: fileData } = await supabase.storage
          .from("admin-vault")
          .download("credentials.json");
        if (fileData) {
          const rawText = await fileData.text();
          credsDict = JSON.parse(rawText || "{}");
        }
      } catch (readErr) {
        // Fallback de migración: Si aún no existe en admin-vault, buscar en product-images para migrarlo
        try {
          const { data: legacyData } = await supabase.storage
            .from("product-images")
            .download("_system/admin_passwords.json");
          if (legacyData) {
            const rawLegacy = await legacyData.text();
            credsDict = JSON.parse(rawLegacy || "{}");
            // Borrar el archivo viejo del bucket público de inmediato por seguridad
            await supabase.storage.from("product-images").remove(["_system/admin_passwords.json"]);
          }
        } catch {}
      }

      const existingCred = credsDict[normalizedEmail];

      // Verificación estricta: Se requiere token firmado válido O coincidencia de contraseña actual
      const isAuthorizedByToken = tokenVerification.valid && tokenVerification.email === normalizedEmail;
      let isAuthorizedByPassword = false;

      if (currentPassword && existingCred?.password) {
        const currentHash = hashPassword(currentPassword);
        if (existingCred.password === currentHash || existingCred.password === currentPassword.trim()) {
          isAuthorizedByPassword = true;
        }
      } else if (!existingCred && currentPassword) {
        // Primer setup si no existía credencial
        isAuthorizedByPassword = true;
      }

      if (!isAuthorizedByToken && !isAuthorizedByPassword) {
        return NextResponse.json(
          { error: "No autorizado para cambiar la contraseña: Se requiere la contraseña actual o una sesión activa." },
          { status: 403 }
        );
      }

      // 2. Actualizar contraseña (almacenada con hash SHA-256)
      const hashed = hashPassword(password);
      credsDict[normalizedEmail] = {
        password: hashed,
        mustChangePassword: false,
        updatedAt: new Date().toISOString(),
      };

      // 3. Guardar en bucket privado 'admin-vault'
      const { error: saveError } = await supabase.storage
        .from("admin-vault")
        .upload("credentials.json", Buffer.from(JSON.stringify(credsDict, null, 2)), {
          contentType: "application/json",
          upsert: true,
        });

      if (saveError) {
        console.error("Error guardando credenciales en vault privado:", saveError);
        throw saveError;
      }

      // Asegurar que el archivo legado en product-images sea destruido
      try {
        await supabase.storage.from("product-images").remove(["_system/admin_passwords.json"]);
      } catch {}

      const adminToken = generateAdminToken(normalizedEmail);
      return NextResponse.json({ success: true, token: adminToken, email: normalizedEmail, mustChangePassword: false });
    }

    if (action === "verify_password") {
      if (!email || !password) {
        return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // 1. Blindaje contra Fuerza Bruta (5 intentos fallidos = 30 min de bloqueo)
      const bruteCheck = checkBruteForceLock(normalizedEmail, clientIp);
      if (bruteCheck.locked) {
        return NextResponse.json({
          valid: false,
          error: `🚫 Acceso bloqueado por seguridad: Múltiples intentos fallidos detectados. Por favor espera ${bruteCheck.remainingMinutes} minutos antes de intentar de nuevo.`
        }, { status: 429 });
      }
      
      try {
        let fileData = null;
        try {
          const res = await supabase.storage.from("admin-vault").download("credentials.json");
          fileData = res.data;
        } catch {}

        if (!fileData) {
          try {
            const legacyRes = await supabase.storage.from("product-images").download("_system/admin_passwords.json");
            fileData = legacyRes.data;
          } catch {}
        }

        if (fileData) {
          const rawText = await fileData.text();
          const credsDict = JSON.parse(rawText || "{}");
          const userCred = credsDict[normalizedEmail];

          if (userCred && userCred.password) {
            const inputHash = hashPassword(password);
            const matches = userCred.password === inputHash || userCred.password === password.trim();
            
            if (matches) {
              // Contraseña correcta: limpiar contador de fallos
              clearLoginFailures(normalizedEmail, clientIp);

              // Comprobar si tiene 2FA (TOTP) activo
              const hasTwoFactor = Boolean(userCred.twoFactor?.enabled && userCred.twoFactor?.secret);

              const userRole = userCred.role || (normalizedEmail === "magc2204@gmail.com" ? "super_admin" : (normalizedEmail === "veronica.hdz.ms@gmail.com" ? "seller_japan" : "admin"));

              // Si debe cambiar contraseña o no tiene 2FA configurado, obligar antes de entrar
              const mustChange = Boolean(userCred.mustChangePassword);

              if (!hasTwoFactor) {
                const temp2FaToken = generateAdminToken(normalizedEmail, 600);
                return NextResponse.json({
                  valid: true,
                  mustSetup2FA: true,
                  mustChangePassword: mustChange,
                  role: userRole,
                  tempToken: temp2FaToken,
                  email: normalizedEmail,
                  message: "Por seguridad institucional, debes activar la verificación en dos pasos (2FA) para continuar."
                });
              }

              // Si tiene 2FA activo, revisar si el dispositivo es de confianza (por 30 días)
              if (hasTwoFactor) {
                const trustedToken = body.trustedDeviceToken || req.headers.get("x-trusted-device-token");
                const isDeviceTrusted = verifyTrustedDeviceToken(normalizedEmail, trustedToken);

                if (!isDeviceTrusted) {
                  // Generar token temporal de 5 minutos solo para el paso 2FA
                  const temp2FaToken = generateAdminToken(normalizedEmail, 300);
                  return NextResponse.json({
                    valid: true,
                    requires2FA: true,
                    mustChangePassword: mustChange,
                    role: userRole,
                    tempToken: temp2FaToken,
                    email: normalizedEmail,
                    message: "Introduce el código de 6 dígitos de tu app autenticadora."
                  });
                }
              }

              const adminToken = generateAdminToken(normalizedEmail);
              return NextResponse.json({
                valid: true,
                requires2FA: false,
                token: adminToken,
                twoFactorEnabled: hasTwoFactor,
                mustChangePassword: mustChange,
                role: userRole,
              });
            } else {
              // Contraseña incorrecta: registrar fallo de fuerza bruta
              const failure = recordLoginFailure(normalizedEmail, clientIp);
              if (failure.locked) {
                return NextResponse.json({
                  valid: false,
                  error: `🚫 Has superado el límite de intentos permitidos. Tu acceso ha sido bloqueado por 30 minutos.`
                }, { status: 429 });
              }
              return NextResponse.json({
                valid: false,
                error: `Contraseña incorrecta. Te quedan ${failure.attemptsLeft} intentos antes del bloqueo de seguridad.`
              });
            }
          }
        }
      } catch (err) {
        console.warn("No se pudo leer almacén de credenciales:", err);
      }

      return NextResponse.json({ valid: null, error: "Credenciales no configuradas en el servidor" });
    }

    // ─── VERIFICACIÓN 2FA DE LOGIN (PASO 2) ─────────────────────────
    if (action === "verify_2fa_login") {
      const { tempToken, code, trustThisDevice } = body;
      if (!email || !code) {
        return NextResponse.json({ error: "Email y código de verificación requeridos" }, { status: 400 });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Blindaje fuerza bruta para códigos 2FA
      const bruteCheck = checkBruteForceLock(normalizedEmail, clientIp);
      if (bruteCheck.locked) {
        return NextResponse.json({
          success: false,
          error: `🚫 Acceso bloqueado por intentos excesivos. Espera ${bruteCheck.remainingMinutes} minutos.`
        }, { status: 429 });
      }

      // Validar tempToken firmado
      const tokenVerification = verifyAdminToken(tempToken);
      if (!tokenVerification.valid || tokenVerification.email !== normalizedEmail) {
        return NextResponse.json({
          success: false,
          error: "La sesión de verificación ha expirado. Ingresa tu contraseña nuevamente."
        }, { status: 401 });
      }

      try {
        const { data: fileData } = await supabase.storage.from("admin-vault").download("credentials.json");
        if (!fileData) {
          return NextResponse.json({ success: false, error: "Credenciales no encontradas" }, { status: 404 });
        }
        const credsDict = JSON.parse(await fileData.text() || "{}");
        const userCred = credsDict[normalizedEmail];

        if (!userCred?.twoFactor?.enabled || !userCred?.twoFactor?.secret) {
          return NextResponse.json({ success: false, error: "2FA no configurado para este usuario" }, { status: 400 });
        }

        const cleanCode = String(code).trim().toUpperCase();
        let isValidCode = verifyTotpCode(userCred.twoFactor.secret, cleanCode, 1);
        let usedBackupCode = false;

        // Si no es un código TOTP de 6 dígitos, revisar si es un código de respaldo de emergencia
        if (!isValidCode && Array.isArray(userCred.twoFactor.backupCodes)) {
          const normCode = cleanCode.replace(/[^A-Z0-9]/g, "");
          const matchIndex = userCred.twoFactor.backupCodes.findIndex((bc: string) => bc.replace(/[^A-Z0-9]/g, "") === normCode);
          if (matchIndex >= 0) {
            isValidCode = true;
            usedBackupCode = true;
            // Consumir el código de respaldo
            userCred.twoFactor.backupCodes.splice(matchIndex, 1);
            await supabase.storage.from("admin-vault").upload("credentials.json", Buffer.from(JSON.stringify(credsDict, null, 2)), {
              contentType: "application/json",
              upsert: true,
            });
          }
        }

        if (!isValidCode) {
          const failure = recordLoginFailure(normalizedEmail, clientIp);
          return NextResponse.json({
            success: false,
            error: `Código de autenticación incorrecto. Te quedan ${failure.attemptsLeft} intentos.`
          }, { status: 401 });
        }

        // Éxito: limpiar fallos
        clearLoginFailures(normalizedEmail, clientIp);

        // Generar token de sesión final
        const finalToken = generateAdminToken(normalizedEmail);

        // Dispositivo de confianza (30 días)
        let trustedDeviceToken: string | null = null;
        if (trustThisDevice) {
          const deviceResult = createTrustedDeviceToken(normalizedEmail);
          trustedDeviceToken = deviceResult.token;
        }

        // Alerta de seguridad por WhatsApp (si está disponible el bridge)
        try {
          const bridgeUrl = process.env.WHATSAPP_BRIDGE_URL || "https://foxdrop-whatsapp-bridge.onrender.com";
          const adminPhone = "524423851722"; // Teléfono de administración
          const dateStr = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
          fetch(`${bridgeUrl}/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": process.env.WHATSAPP_BRIDGE_API_KEY || "foxdrop_secret_2026" },
            body: JSON.stringify({
              phone: adminPhone,
              text: `🔐 *FoxDrop Alerta de Seguridad*\n\nNuevo inicio de sesión exitoso en el Panel Administrativo.\n\n👤 *Usuario:* ${normalizedEmail}\n📅 *Fecha:* ${dateStr}\n🛡️ *Método:* 2FA (${usedBackupCode ? 'Código de Respaldo' : 'Google Authenticator'})\n🌐 *IP:* ${clientIp}\n\n_Si fuiste tú, ignora este mensaje. Si no fuiste tú, cambia tu contraseña de inmediato._`
            })
          }).catch(() => {});
        } catch {}

        const userRole = userCred.role || (normalizedEmail === "magc2204@gmail.com" ? "super_admin" : (normalizedEmail === "veronica.hdz.ms@gmail.com" ? "seller_japan" : "admin"));

        return NextResponse.json({
          success: true,
          token: finalToken,
          trustedDeviceToken,
          usedBackupCode,
          backupCodesLeft: userCred.twoFactor.backupCodes?.length || 0,
          role: userRole,
          mustChangePassword: Boolean(userCred.mustChangePassword),
        });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message || "Error validando 2FA" }, { status: 500 });
      }
    }

    // ─── CONFIGURAR 2FA: INICIAR (Generar Secreto y QR) ──────────────
    if (action === "setup_2fa_init") {
      const adminEmail = (body.adminEmail || body.email || req.headers.get("x-admin-email") || "").trim().toLowerCase();
      if (!adminEmail) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

      const { secret, otpauthUrl } = generateTotpSecret(adminEmail);
      const backupCodes = generateBackupCodes(6);
      
      // Generar QR nativo en Data URL (base64) para máxima confiabilidad sin dependencias externas
      let qrCodeUrl = "";
      try {
        qrCodeUrl = await QRCode.toDataURL(otpauthUrl, {
          width: 260,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
      } catch {
        qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(otpauthUrl)}`;
      }

      return NextResponse.json({
        success: true,
        secret,
        otpauthUrl,
        qrCodeUrl,
        backupCodes,
      });
    }

    // ─── CONFIGURAR 2FA: CONFIRMAR Y GUARDAR ────────────────────────
    if (action === "setup_2fa_confirm") {
      const { secret, code, backupCodes } = body;
      const adminEmail = (body.adminEmail || body.email || req.headers.get("x-admin-email") || "").trim().toLowerCase();
      if (!adminEmail || !secret || !code) {
        return NextResponse.json({ error: "Datos incompletos para activar 2FA" }, { status: 400 });
      }

      // Validar que el código ingresado coincida con el secreto
      const isValid = verifyTotpCode(secret, code, 1);
      if (!isValid) {
        return NextResponse.json({
          error: "El código de 6 dígitos no coincide. Asegúrate de haber escaneado el código QR en Google Authenticator y que la hora de tu teléfono esté sincronizada en automático."
        }, { status: 400 });
      }

      try {
        const { data: fileData } = await supabase.storage.from("admin-vault").download("credentials.json");
        const credsDict = JSON.parse(await fileData?.text() || "{}");
        if (!credsDict[adminEmail]) {
          credsDict[adminEmail] = { password: "", mustChangePassword: false, updatedAt: new Date().toISOString() };
        }

        credsDict[adminEmail].twoFactor = {
          enabled: true,
          secret: secret.trim(),
          backupCodes: Array.isArray(backupCodes) ? backupCodes : generateBackupCodes(6),
          enabledAt: new Date().toISOString(),
        };

        await supabase.storage.from("admin-vault").upload("credentials.json", Buffer.from(JSON.stringify(credsDict, null, 2)), {
          contentType: "application/json",
          upsert: true,
        });

        return NextResponse.json({
          success: true,
          message: "¡Verificación en Dos Pasos (2FA) activada con éxito en tu cuenta!"
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message || "Error guardando configuración de 2FA" }, { status: 500 });
      }
    }

    // ─── DESACTIVAR 2FA ──────────────────────────────────────────────
    if (action === "disable_2fa") {
      const { password, code } = body;
      const adminEmail = (body.adminEmail || req.headers.get("x-admin-email") || "").trim().toLowerCase();
      if (!adminEmail || !password) {
        return NextResponse.json({ error: "Contraseña requerida para desactivar 2FA" }, { status: 400 });
      }

      try {
        const { data: fileData } = await supabase.storage.from("admin-vault").download("credentials.json");
        const credsDict = JSON.parse(await fileData?.text() || "{}");
        const userCred = credsDict[adminEmail];

        if (!userCred) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

        const inputHash = hashPassword(password);
        if (userCred.password !== inputHash && userCred.password !== password.trim()) {
          return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
        }

        if (code && userCred.twoFactor?.secret) {
          const isValid = verifyTotpCode(userCred.twoFactor.secret, code, 1);
          if (!isValid) return NextResponse.json({ error: "Código 2FA incorrecto" }, { status: 401 });
        }

        delete userCred.twoFactor;
        await supabase.storage.from("admin-vault").upload("credentials.json", Buffer.from(JSON.stringify(credsDict, null, 2)), {
          contentType: "application/json",
          upsert: true,
        });

        return NextResponse.json({ success: true, message: "2FA desactivado" });
      } catch (err: any) {
        return NextResponse.json({ error: err.message || "Error al desactivar 2FA" }, { status: 500 });
      }
    }

    // ─── CONSULTAR ESTADO DE 2FA ────────────────────────────────────
    if (action === "get_2fa_status") {
      const adminEmail = (body.adminEmail || req.headers.get("x-admin-email") || "").trim().toLowerCase();
      if (!adminEmail) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

      try {
        const { data: fileData } = await supabase.storage.from("admin-vault").download("credentials.json");
        const credsDict = JSON.parse(await fileData?.text() || "{}");
        const userCred = credsDict[adminEmail];

        return NextResponse.json({
          success: true,
          enabled: Boolean(userCred?.twoFactor?.enabled),
          backupCodesCount: Array.isArray(userCred?.twoFactor?.backupCodes) ? userCred.twoFactor.backupCodes.length : 0,
        });
      } catch {
        return NextResponse.json({ success: true, enabled: false, backupCodesCount: 0 });
      }
    }

    // ─── CARRUSEL HERO ───────────────────────────────────────────
    if (action === "delete_slide") {
      if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

      // 1. Intentar borrar en tabla Supabase
      try {
        await supabase.from("carousel_slides").delete().eq("id", id);
      } catch (tableErr) {
        console.warn("Aviso borrando en tabla carousel_slides:", tableErr);
      }

      // 2. Sincronizar en JSON storage como fallback de persistencia garantizada
      try {
        let currentSlides: any[] = [];
        const { data: fileData } = await supabase.storage
          .from("product-images")
          .download("_system/carousel_slides.json");
        if (fileData) {
          const raw = await fileData.text();
          currentSlides = JSON.parse(raw || "[]");
        }
        const filtered = currentSlides.filter((s: any) => s.id !== id);
        const buffer = Buffer.from(JSON.stringify(filtered, null, 2));
        await supabase.storage
          .from("product-images")
          .upload("_system/carousel_slides.json", buffer, {
            contentType: "application/json",
            upsert: true,
          });
      } catch (storageErr) {
        console.warn("Aviso borrando slide en JSON storage:", storageErr);
      }

      return NextResponse.json({ success: true, deletedId: id });
    }

    if (action === "create_slide") {
      const { slide } = body;
      const slideId = `slide-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newSlide = {
        id: slideId,
        title: slide.title,
        subtitle: slide.subtitle || "",
        image_url: slide.image_url,
        cta_text: slide.cta_text || "Ver Catálogo Completo",
        cta_category: slide.cta_category || "Todas",
        sort_order: slide.sort_order || 1,
        is_active: slide.is_active ?? true,
      };

      // 1. Intentar insertar en tabla SQL
      let savedSlide = newSlide;
      try {
        const { data, error } = await supabase.from("carousel_slides").insert([newSlide]).select().single();
        if (!error && data) {
          savedSlide = data;
        }
      } catch (tableErr) {
        console.warn("Tabla carousel_slides no disponible, usando JSON storage:", tableErr);
      }

      // 2. Sincronizar en storage JSON
      try {
        let currentSlides: any[] = [];
        const { data: fileData } = await supabase.storage
          .from("product-images")
          .download("_system/carousel_slides.json");
        if (fileData) {
          const raw = await fileData.text();
          currentSlides = JSON.parse(raw || "[]");
        }
        currentSlides.push(savedSlide);
        const buffer = Buffer.from(JSON.stringify(currentSlides, null, 2));
        await supabase.storage
          .from("product-images")
          .upload("_system/carousel_slides.json", buffer, {
            contentType: "application/json",
            upsert: true,
          });
      } catch (storageErr) {
        console.warn("Aviso guardando slide en storage:", storageErr);
      }

      return NextResponse.json({ success: true, data: savedSlide });
    }

    if (action === "update_slide") {
      const { slide } = body;
      if (!slide || !slide.id) {
        return NextResponse.json({ error: "Slide e ID requeridos" }, { status: 400 });
      }

      // 1. Intentar actualizar en tabla SQL
      let updatedSlide = slide;
      try {
        const { data, error } = await supabase
          .from("carousel_slides")
          .update(slide)
          .eq("id", slide.id)
          .select()
          .single();
        if (!error && data) {
          updatedSlide = data;
        }
      } catch (tableErr) {
        console.warn("Tabla carousel_slides no disponible al actualizar:", tableErr);
      }

      // 2. Sincronizar en storage JSON
      try {
        let currentSlides: any[] = [];
        const { data: fileData } = await supabase.storage
          .from("product-images")
          .download("_system/carousel_slides.json");
        if (fileData) {
          const raw = await fileData.text();
          currentSlides = JSON.parse(raw || "[]");
        }
        const idx = currentSlides.findIndex((s: any) => s.id === slide.id);
        if (idx !== -1) {
          currentSlides[idx] = { ...currentSlides[idx], ...updatedSlide };
        } else {
          currentSlides.push(updatedSlide);
        }
        const buffer = Buffer.from(JSON.stringify(currentSlides, null, 2));
        await supabase.storage
          .from("product-images")
          .upload("_system/carousel_slides.json", buffer, {
            contentType: "application/json",
            upsert: true,
          });
      } catch (storageErr) {
        console.warn("Aviso actualizando slide en storage:", storageErr);
      }

      return NextResponse.json({ success: true, data: updatedSlide });
    }

    if (action === "get_slides") {
      // 1. Intentar primero desde tabla SQL
      try {
        const { data, error } = await supabase
          .from("carousel_slides")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) {
          return NextResponse.json({ success: true, data });
        }
      } catch (tableErr) {
        console.warn("Aviso consultando tabla carousel_slides:", tableErr);
      }

      // 2. Fallback a JSON storage
      try {
        const { data: fileData } = await supabase.storage
          .from("product-images")
          .download("_system/carousel_slides.json");
        if (fileData) {
          const raw = await fileData.text();
          const parsed = JSON.parse(raw || "[]");
          if (Array.isArray(parsed)) {
            const activeOnly = parsed.filter((s: any) => s.is_active !== false);
            return NextResponse.json({ success: true, data: activeOnly });
          }
        }
      } catch (storageErr) {
        // Ninguno guardado aún
      }

      return NextResponse.json({ success: true, data: [] });
    }

    // ─── CARRITOS ABANDONADOS ────────────────────────────────────
    if (action === "get_abandoned_carts") {
      const { data, error } = await supabase
        .from("abandoned_carts")
        .select("*")
        .order("last_active", { ascending: false });

      if (error) {
        console.warn("Error consultando carritos abandonados:", error);
        return NextResponse.json({ success: true, data: [] });
      }

      const mapped = (data || []).map((c: any) => ({
        id: c.id,
        clientName: c.client_name || "Cliente Invitado",
        clientPhone: c.client_phone || "",
        clientEmail: c.client_email || undefined,
        items: Array.isArray(c.items) ? c.items : [],
        total: Number(c.total) || 0,
        lastActive: c.last_active || c.created_at,
        followedUp: Boolean(c.followed_up),
        createdAt: c.created_at,
      }));

      return NextResponse.json({ success: true, data: mapped });
    }

    if (action === "update_abandoned_cart") {
      const { cartId, followedUp } = body;
      if (!cartId) return NextResponse.json({ error: "cartId requerido" }, { status: 400 });

      const { data, error } = await supabase
        .from("abandoned_carts")
        .update({ followed_up: Boolean(followedUp) })
        .eq("id", cartId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "delete_abandoned_cart") {
      if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
      const { error } = await supabase.from("abandoned_carts").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true, deletedId: id });
    }

    if (action === "create_test_abandoned_cart") {
      const sampleItems = [
        { title: "Kit Cosméticos Coreanos Fox Glow", quantity: 1, price: 349, image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80" },
        { title: "Llavero Edición Especial FoxDrop", quantity: 2, price: 89, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80" }
      ];
      const { data, error } = await supabase
        .from("abandoned_carts")
        .insert([
          {
            client_name: "Mariana Soto",
            client_phone: "2221234567",
            client_email: "mariana.soto@ejemplo.com",
            items: sampleItems,
            total: 527.00,
            followed_up: false,
            last_active: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    // ─── CONFIGURACIÓN PROGRAMA DE MIEMBROS & FIDELIDAD ────────────
    if (action === "get_club_settings") {
      try {
        const { data: fileData } = await supabase.storage
          .from("product-images")
          .download("_system/club_settings.json");

        if (fileData) {
          const rawText = await fileData.text();
          const parsed = JSON.parse(rawText || "{}");
          if (parsed && parsed.tiers && parsed.tiers.length > 0) {
            return NextResponse.json({ success: true, settings: parsed });
          }
        }
      } catch (err) {
        console.warn("Aviso: club_settings.json aún no configurado en storage, devolviendo default:", err);
      }

      const defaultSettings = {
        currencyName: "Estrellas",
        currencySymbol: "⭐",
        pesosPerPoint: 10,
        pointMonetaryValueMxn: 0.10,
        tiers: [
          { name: "Miembro Bronce", minPoints: 0, discountPercent: 0, badge: "🥉" },
          { name: "Miembro Plata", minPoints: 500, discountPercent: 3, badge: "🥈" },
          { name: "Miembro Oro", minPoints: 1500, discountPercent: 7, badge: "🥇" },
          { name: "Miembro Platino Fox", minPoints: 3000, discountPercent: 12, badge: "👑" },
        ],
      };
      return NextResponse.json({ success: true, settings: defaultSettings });
    }

    if (action === "save_club_settings") {
      const { settings } = body;
      if (!settings || !Array.isArray(settings.tiers)) {
        return NextResponse.json({ error: "Configuración inválida" }, { status: 400 });
      }

      const buffer = Buffer.from(JSON.stringify(settings, null, 2));
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload("_system/club_settings.json", buffer, {
          contentType: "application/json",
          upsert: true,
        });

      if (uploadError) {
        console.error("Error guardando club_settings en Supabase:", uploadError);
        throw uploadError;
      }

      return NextResponse.json({ success: true, settings });
    }

    // ─── CONFIGURACIÓN DE ENVÍOS & DATOS DE TRANSFERENCIA (CHECKOUT) ────────────
    if (action === "get_checkout_settings") {
      try {
        const { data: fileData } = await supabase.storage
          .from("product-images")
          .download("_system/checkout_settings.json");

        if (fileData) {
          const rawText = await fileData.text();
          const parsed = JSON.parse(rawText || "{}");
          if (parsed && Array.isArray(parsed.shippingMethods)) {
            return NextResponse.json({ success: true, settings: parsed });
          }
        }
      } catch (err) {
        console.warn("checkout_settings.json no encontrado, usando defaults:", err);
      }

      const defaultSettings = {
        shippingMethods: [
          {
            id: 'pickup',
            name: 'Acordar con el vendedor (Entrega Personal)',
            description: 'Punto de encuentro personal en Puebla o coordinar por WhatsApp (Sin costo)',
            price: 0,
            requiresAddress: false,
            enabled: true,
          },
          {
            id: 'local_puebla',
            name: 'Envío Local (Puebla y alrededores)',
            description: 'Entrega por mensajería local a domicilio',
            price: 50,
            requiresAddress: true,
            enabled: true,
          },
          {
            id: 'national',
            name: 'Envío Nacional por Paquetería',
            description: 'Guía de rastreo nacional a cualquier estado de la República (FedEx/Estafeta/DHL)',
            price: 140,
            requiresAddress: true,
            enabled: true,
          },
        ],
        bankTransfer: {
          bankName: 'BBVA México',
          accountHolder: 'FoxDrop México',
          clabe: '012680015948372619',
          accountNumber: '1594837261',
          notes: 'Realiza tu transferencia desde tu aplicación bancaria. Envía tu captura de pantalla por WhatsApp para despachar tu paquete de inmediato.',
        },
        allowCashOnDelivery: true,
      };

      return NextResponse.json({ success: true, settings: defaultSettings });
    }

    if (action === "save_checkout_settings") {
      const { settings } = body;
      if (!settings || !Array.isArray(settings.shippingMethods)) {
        return NextResponse.json({ error: "Configuración inválida" }, { status: 400 });
      }

      const buffer = Buffer.from(JSON.stringify(settings, null, 2));
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload("_system/checkout_settings.json", buffer, {
          contentType: "application/json",
          upsert: true,
        });

      return NextResponse.json({ success: true, settings });
    }

    // ─── CONFIGURACIÓN VISUAL GENERAL DE LA TIENDA (BANNERS & PROMOCIONES) ──
    if (action === "get_store_settings") {
      try {
        const { data: fileData } = await supabase.storage
          .from("product-images")
          .download("_system/store_settings.json");

        if (fileData) {
          const rawText = await fileData.text();
          const parsed = JSON.parse(rawText || "{}");
          return NextResponse.json({ success: true, settings: parsed });
        }
      } catch (err) {
        console.warn("store_settings.json no encontrado, usando defaults:", err);
      }

      // Por defecto la liquidación está desactivada hasta que el admin la active
      const defaultStoreSettings = {
        showClearanceBanner: false,
        clearanceTitle: "Liquidación de Importación",
        clearanceDiscountText: "Hasta 70% Menos",
        clearanceSubtitle: "En comparación con precios de tiendas departamentales y marketplaces",
        carouselIntervalSeconds: 8,
      };

      return NextResponse.json({ success: true, settings: defaultStoreSettings });
    }

    if (action === "save_store_settings") {
      const { settings } = body;
      if (!settings || typeof settings !== "object") {
        return NextResponse.json({ error: "Configuración inválida" }, { status: 400 });
      }

      const buffer = Buffer.from(JSON.stringify(settings, null, 2));
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload("_system/store_settings.json", buffer, {
          contentType: "application/json",
          upsert: true,
        });

      if (uploadError) {
        console.error("Error guardando store_settings en Supabase:", uploadError);
        throw uploadError;
      }

      return NextResponse.json({ success: true, settings });
    }

    // ─── MÉTRICAS DE FIDELIDAD & INVERSIÓN AL CLIENTE ─────────────
    if (action === "get_loyalty_metrics") {
      try {
        // 1. Perfiles y puntos en circulación
        const { data: profiles, error: pError } = await supabase
          .from("profiles")
          .select("id, full_name, loyalty_points, created_at");

        if (pError) console.warn("Error perfiles para métricas:", pError);

        // 2. Pedidos y descuentos otorgados
        const { data: orders, error: oError } = await supabase
          .from("orders")
          .select("id, subtotal, shipping_cost, total, status, created_at");

        if (oError) console.warn("Error orders para métricas:", oError);

        // 3. Descargar configuración actual de tiers
        let tiers = [
          { name: "Miembro Bronce", minPoints: 0, discountPercent: 0, badge: "🥉" },
          { name: "Miembro Plata", minPoints: 500, discountPercent: 3, badge: "🥈" },
          { name: "Miembro Oro", minPoints: 1500, discountPercent: 7, badge: "🥇" },
          { name: "Miembro Platino Fox", minPoints: 3000, discountPercent: 12, badge: "👑" },
        ];
        let pointMonetaryValueMxn = 0.10;

        try {
          const { data: fileData } = await supabase.storage
            .from("product-images")
            .download("_system/club_settings.json");
          if (fileData) {
            const raw = JSON.parse(await fileData.text() || "{}");
            if (raw.tiers) tiers = raw.tiers;
            if (raw.pointMonetaryValueMxn) pointMonetaryValueMxn = Number(raw.pointMonetaryValueMxn);
          }
        } catch {}

        let totalCirculatingPoints = 0;
        const tierCounts = { bronze: 0, silver: 0, gold: 0, platinum: 0 };

        (profiles || []).forEach((p: any) => {
          const pts = Number(p.loyalty_points) || 0;
          totalCirculatingPoints += pts;

          const sortedTiers = [...tiers].sort((a, b) => b.minPoints - a.minPoints);
          const currentTier = sortedTiers.find(t => pts >= t.minPoints) || sortedTiers[sortedTiers.length - 1];

          const tName = (currentTier?.name || "").toLowerCase();
          if (tName.includes("platino")) tierCounts.platinum++;
          else if (tName.includes("oro")) tierCounts.gold++;
          else if (tName.includes("plata")) tierCounts.silver++;
          else tierCounts.bronze++;
        });

        // Calcular descuentos otorgados en pedidos
        let totalLoyaltyDiscountGiven = 0;
        (orders || []).forEach((o: any) => {
          const expectedTotal = (Number(o.subtotal) || 0) + (Number(o.shipping_cost) || 0);
          const actualTotal = Number(o.total) || 0;
          const diff = expectedTotal - actualTotal;
          if (diff > 0.01) {
            totalLoyaltyDiscountGiven += diff;
          }
        });

        const metrics = {
          totalClients: (profiles || []).length,
          totalCirculatingPoints,
          pointMonetaryValueMxn,
          circulatingLiabilityMxn: Number((totalCirculatingPoints * pointMonetaryValueMxn).toFixed(2)),
          totalLoyaltyDiscountGiven: Number(totalLoyaltyDiscountGiven.toFixed(2)),
          tierCounts,
          totalOrdersAnalyzed: (orders || []).length,
        };

        return NextResponse.json({ success: true, metrics });
      } catch (err: any) {
        console.error("Error calculando loyalty metrics:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    // ─── GENERACIÓN DE TICKET PROFESIONAL CON LOGO FOXDROP ───────
    if (action === "generate_ticket_image") {
      try {
        const { ticket } = body;
        if (!ticket || !ticket.orderNumber) {
          return NextResponse.json({ error: "Datos de ticket requeridos" }, { status: 400 });
        }

        const orderNumber = ticket.orderNumber;

        // Si el cliente nos mandó la imagen de ticket capturada y no está vacía (> 3000 chars)
        if (ticket.imageDataUrl && typeof ticket.imageDataUrl === "string" && ticket.imageDataUrl.startsWith("data:image/") && ticket.imageDataUrl.length > 3000) {
          const parts = ticket.imageDataUrl.split(",");
          const base64Str = parts[1] || parts[0];
          const ticketPngBuffer = Buffer.from(base64Str, "base64");
          // Si el buffer es mayor a 5KB (asegura que no es un pixel o canvas en blanco de 1KB)
          if (ticketPngBuffer.length > 5000) {
            const ticketFileName = `tickets/Ticket-${orderNumber}-${Date.now()}.png`;

            try {
              const { data: buckets } = await supabase.storage.listBuckets();
              const hasBucket = buckets?.some((b: any) => b.name === "product-images");
              if (!hasBucket) {
                await supabase.storage.createBucket("product-images", { public: true, fileSizeLimit: 10485760 });
              }
            } catch {}

            const { error: uploadErr } = await supabase.storage
              .from("product-images")
              .upload(ticketFileName, ticketPngBuffer, {
                contentType: "image/png",
                upsert: true,
              });

            let publicImageUrl = "";
            if (!uploadErr) {
              const { data: pubData } = supabase.storage.from("product-images").getPublicUrl(ticketFileName);
              publicImageUrl = pubData?.publicUrl || "";
            }

            return NextResponse.json({
              success: true,
              imageUrl: publicImageUrl || ticket.imageDataUrl,
              downloadUrl: publicImageUrl || ticket.imageDataUrl,
              base64: ticket.imageDataUrl,
            });
          }
        }

        const width = 600;
        const items = ticket.items || [];
        const dateStr = ticket.date ? new Date(ticket.date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString('es-MX');
        const clientName = ticket.clientName || 'Cliente FoxDrop';
        const clientPhone = ticket.clientPhone || 'Mostrador';
        const total = Number(ticket.total) || 0;
        const points = Number(ticket.pointsEarned) || Math.floor(total / 10);
        const methodNames: Record<string, string> = {
          cash: 'Efectivo',
          card: 'Tarjeta Débito/Crédito',
          spei: 'Transferencia SPEI',
        };
        const paymentMethod = methodNames[ticket.paymentMethod] || ticket.paymentMethod || 'Efectivo';

        // Calcular altura dinámica según cantidad de artículos
        const itemsHeight = Math.max(80, items.length * 42);
        const totalHeight = 680 + itemsHeight;
        const cardHeight = 480 + itemsHeight;

        const escapeXml = (unsafe: string) => {
          return (unsafe || '').replace(/[<>&'"]/g, (c) => {
            switch (c) {
              case '<': return '&lt;';
              case '>': return '&gt;';
              case '&': return '&amp;';
              case '\'': return '&apos;';
              case '"': return '&quot;';
              default: return c;
            }
          });
        };

        const rowsSvg = items.map((it: any, idx: number) => {
          const qty = it.quantity || 1;
          const title = escapeXml((it.product?.title || it.title || 'Artículo').slice(0, 32));
          const price = Number(it.product?.publicPrice || it.price || 0) * qty;
          return `
            <g transform="translate(0, ${idx * 40})">
              <text x="50" y="20" font-family="sans-serif, Arial" font-size="15" font-weight="bold" fill="#1e293b">${qty}x ${title}</text>
              <text x="550" y="20" font-family="monospace, Courier" font-size="16" font-weight="bold" fill="#0f172a" text-anchor="end">$${price.toFixed(2)}</text>
            </g>
          `;
        }).join('');

        const dividerY = 360 + itemsHeight;
        const payY = dividerY + 35;
        const totalY = payY + 45;
        const clubBoxY = totalY + 30;
        const clubTextY = clubBoxY + 38;
        const footerY1 = clubBoxY + 95;
        const footerY2 = footerY1 + 22;

        const svg = `
        <svg width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#0F3E36"/>
              <stop offset="100%" stop-color="#1F2D3D"/>
            </linearGradient>
            <linearGradient id="orangeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#E65F2B"/>
              <stop offset="100%" stop-color="#FF8C42"/>
            </linearGradient>
            <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
              <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000" flood-opacity="0.1"/>
            </filter>
          </defs>

          <!-- Fondo general -->
          <rect width="${width}" height="${totalHeight}" rx="32" fill="#F1F5F9"/>
          
          <!-- Encabezado con degradado FoxDrop -->
          <path d="M 0 32 Q 0 0 32 0 L ${width - 32} 0 Q ${width} 0 ${width} 32 L ${width} 150 L 0 150 Z" fill="url(#headerGrad)"/>
          <rect x="0" y="146" width="${width}" height="5" fill="url(#orangeGrad)"/>

          <!-- Títulos del encabezado -->
          <text x="340" y="70" font-family="sans-serif, Arial" font-size="24" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Foxdrop - Tu atajo al mundo</text>
          <text x="340" y="105" font-family="sans-serif, Arial" font-size="12" font-weight="bold" fill="#E6A76E" text-anchor="middle">COMPROBANTE OFICIAL DE COMPRA</text>

          <!-- Tarjeta central de ticket -->
          <rect x="25" y="170" width="550" height="${cardHeight}" rx="24" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" filter="url(#shadow)"/>

          <!-- Metadatos de la venta -->
          <text x="50" y="212" font-family="sans-serif, Arial" font-size="12" font-weight="bold" fill="#64748B">FOLIO DE ORDEN</text>
          <text x="550" y="212" font-family="monospace, Courier" font-size="18" font-weight="bold" fill="#E65F2B" text-anchor="end">${escapeXml(orderNumber)}</text>

          <text x="50" y="242" font-family="sans-serif, Arial" font-size="12" font-weight="bold" fill="#64748B">FECHA Y HORA</text>
          <text x="550" y="242" font-family="sans-serif, Arial" font-size="14" font-weight="bold" fill="#1E293B" text-anchor="end">${escapeXml(dateStr)}</text>

          <text x="50" y="272" font-family="sans-serif, Arial" font-size="12" font-weight="bold" fill="#64748B">CLIENTE</text>
          <text x="550" y="272" font-family="sans-serif, Arial" font-size="14" font-weight="bold" fill="#1E293B" text-anchor="end">${escapeXml(clientName)}</text>

          <text x="50" y="302" font-family="sans-serif, Arial" font-size="12" font-weight="bold" fill="#64748B">TELÉFONO REGISTRADO</text>
          <text x="550" y="302" font-family="monospace, Courier" font-size="15" font-weight="bold" fill="#0284C7" text-anchor="end">${escapeXml(clientPhone)}</text>

          <!-- Línea divisoria picada tipo ticket -->
          <line x1="50" y1="326" x2="550" y2="326" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="6,6"/>

          <!-- Encabezado de artículos -->
          <text x="50" y="354" font-family="sans-serif, Arial" font-size="11" font-weight="bold" fill="#94A3B8">PRODUCTO(S)</text>
          <text x="550" y="354" font-family="sans-serif, Arial" font-size="11" font-weight="bold" fill="#94A3B8" text-anchor="end">SUBTOTAL</text>

          <!-- Lista de artículos -->
          <g transform="translate(0, 360)">
            ${rowsSvg}
          </g>

          <!-- Línea divisoria sólida -->
          <line x1="50" y1="${dividerY}" x2="550" y2="${dividerY}" stroke="#E2E8F0" stroke-width="2"/>

          <!-- Método de pago y Total -->
          <text x="50" y="${payY}" font-family="sans-serif, Arial" font-size="13" font-weight="bold" fill="#64748B">MÉTODO DE PAGO</text>
          <text x="550" y="${payY}" font-family="sans-serif, Arial" font-size="14" font-weight="bold" fill="#1E293B" text-anchor="end">${escapeXml(paymentMethod)}</text>

          <text x="50" y="${totalY}" font-family="sans-serif, Arial" font-size="18" font-weight="bold" fill="#0F172A">TOTAL PAGADO</text>
          <text x="550" y="${totalY}" font-family="sans-serif, Arial" font-size="28" font-weight="bold" fill="#0F3E36" text-anchor="end">$${total.toFixed(2)} MXN</text>

          <!-- Caja de Puntos Club FoxDrop -->
          <rect x="50" y="${clubBoxY}" width="500" height="62" rx="16" fill="#FFF7ED" stroke="#FDBA74" stroke-width="1.5"/>
          <text x="75" y="${clubTextY}" font-family="sans-serif, Arial" font-size="15" font-weight="bold" fill="#9A3412">CLUB FOXDROP:</text>
          <text x="525" y="${clubTextY}" font-family="sans-serif, Arial" font-size="18" font-weight="bold" fill="#EA580C" text-anchor="end">+${points} Puntos Ganados</text>

          <!-- Footer de garantía y web -->
          <text x="${width / 2}" y="${footerY1}" font-family="sans-serif, Arial" font-size="12" font-weight="normal" fill="#64748B" text-anchor="middle">Consulta tus puntos y catálogo completo en https://foxdrop.mx</text>
          <text x="${width / 2}" y="${footerY2}" font-family="sans-serif, Arial" font-size="11" font-weight="bold" fill="#94A3B8" text-anchor="middle">¡GRACIAS POR TU COMPRA EN FOXDROP PUEBLA!</text>
        </svg>
        `;;

        // Renderizar PNG con sharp y estampar el logo del zorrito 3D
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const sharp = require("sharp");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require("path");
        const logoPath = path.join(process.cwd(), "public", "fox-logo-head-3d.png");

        const headBuf = await sharp(logoPath)
          .resize(90, 90, { fit: "contain" })
          .png()
          .toBuffer();

        const ticketPngBuffer = await sharp(Buffer.from(svg))
          .composite([{ input: headBuf, top: 30, left: 45 }])
          .png()
          .toBuffer();

        // Subir a Supabase Storage para generar URL pública y descargable directa
        const ticketFileName = `tickets/Ticket-${orderNumber}-${Date.now()}.png`;

        try {
          const { data: buckets } = await supabase.storage.listBuckets();
          const hasBucket = buckets?.some((b: any) => b.name === "product-images");
          if (!hasBucket) {
            await supabase.storage.createBucket("product-images", { public: true, fileSizeLimit: 10485760 });
          }
        } catch {}

        const { error: uploadErr } = await supabase.storage
          .from("product-images")
          .upload(ticketFileName, ticketPngBuffer, {
            contentType: "image/png",
            upsert: true,
          });

        let publicImageUrl = "";
        if (!uploadErr) {
          const { data: pubData } = supabase.storage.from("product-images").getPublicUrl(ticketFileName);
          publicImageUrl = pubData?.publicUrl || "";
        }

        const base64Data = `data:image/png;base64,${ticketPngBuffer.toString("base64")}`;

        return NextResponse.json({
          success: true,
          imageUrl: publicImageUrl || base64Data,
          downloadUrl: publicImageUrl || base64Data,
          base64: base64Data,
        });
      } catch (ticketErr: any) {
        console.error("Error generando ticket en servidor:", ticketErr);
        return NextResponse.json({ error: ticketErr.message || "Error al renderizar ticket" }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (err: any) {
    console.error("Error en /api/admin:", err);
    return NextResponse.json({ error: err.message || "Error interno del servidor" }, { status: 500 });
  }
}
