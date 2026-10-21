// Inicialización garantizada de clave de CJ Dropshipping para entornos de producción
if (!process.env.CJ_API_KEY) {
  process.env.CJ_API_KEY = "CJ5965480@api@11b106a82c66403bb28d5cca4b6882ad";
}

import { NextRequest, NextResponse } from "next/server";
import { searchCjProducts, getCjProductDetails } from "@/lib/cjdropshipping";
import { verifyAdminToken, checkRateLimit } from "@/lib/security";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";
    if (!checkRateLimit(`cj_api:${clientIp}`, 60, 60)) {
      return NextResponse.json({ error: "Límite de solicitudes de CJ excedido" }, { status: 429 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const body = await req.json().catch(() => ({}));
    const resolvedToken = token || body.adminToken || null;

    if (!verifyAdminToken(resolvedToken).valid) {
      return NextResponse.json({ error: "No autorizado para consultar la API de CJ" }, { status: 401 });
    }

    const { action, query, page, size, pid, categoryId, importProduct } = body;

    // 1. Búsqueda de productos en CJ
    if (action === "search_products") {
      const results = await searchCjProducts(query || "", Number(page) || 1, Number(size) || 20, categoryId);
      return NextResponse.json({ success: true, ...results });
    }

    // 2. Detalle completo de producto
    if (action === "get_product_detail") {
      if (!pid) {
        return NextResponse.json({ error: "pid requerido" }, { status: 400 });
      }
      const detail = await getCjProductDetails(pid);
      return NextResponse.json({ success: true, detail });
    }

    // 3. Importar producto de CJ a catálogo local de FoxDrop
    if (action === "import_cj_product") {
      if (!importProduct || !importProduct.title) {
        return NextResponse.json({ error: "Datos de producto a importar incompletos" }, { status: 400 });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createServerClient() as any;

      // Resolver categoría
      let categoryId: string | null = null;
      const catTrimmed = (importProduct.categoryName || "Novedades & Gadgets").trim();
      let { data: catData } = await supabase
        .from("categories")
        .select("id")
        .ilike("name", catTrimmed)
        .maybeSingle();

      if (!catData?.id) {
        const slug = catTrimmed.toLowerCase().replace(/[^a-z0-9]/g, "-") || "novedades";
        const { data: newCat } = await supabase
          .from("categories")
          .insert([{ name: catTrimmed, slug, icon: "✈️", is_active: true }])
          .select("id")
          .maybeSingle();
        catData = newCat;
      }
      categoryId = catData?.id || null;

      const sku = importProduct.sku || `CJ-${Math.floor(10000 + Math.random() * 90000)}`;
      const images = Array.isArray(importProduct.images) && importProduct.images.length > 0
        ? importProduct.images
        : (importProduct.imageUrl ? [importProduct.imageUrl] : ["/no-image.svg"]);

      const insertRecord: any = {
        sku,
        title: importProduct.title,
        description: importProduct.description || "📦 Producto de importación directa a tu domicilio. Entrega estimada de 10 a 15 días hábiles con guía de rastreo internacional.",
        category_id: categoryId,
        base_cost_usd: Number(importProduct.baseCostUsd) || 0,
        base_cost_mxn: Number(importProduct.baseCostMxn) || 0,
        shipping_cost_allocated: 0,
        public_price: Number(importProduct.publicPrice) || Math.round((Number(importProduct.baseCostMxn) || 100) * 1.8),
        stock: 999, // Dropshipping tiene inventario virtual continuo en fábrica
        images,
        discount_percent: 0,
        is_active: true,
      };

      const { data, error } = await supabase
        .from("products")
        .insert([insertRecord])
        .select("*, categories(id, name, slug, icon)")
        .single();

      if (error) {
        console.error("Error insertando producto CJ:", error);
        return NextResponse.json({ error: error.message || "Error al crear producto" }, { status: 500 });
      }

      // Asignar marca / procedencia CJ Dropshipping
      if (data?.id) {
        try {
          let bMap: Record<string, string> = {};
          const { data: bFile } = await supabase.storage
            .from("product-images")
            .download("_system/product_brands.json");
          if (bFile) bMap = JSON.parse(await bFile.text() || "{}");
          bMap[data.id] = "CJ Dropshipping";
          await supabase.storage
            .from("product-images")
            .upload("_system/product_brands.json", Buffer.from(JSON.stringify(bMap, null, 2)), {
              contentType: "application/json",
              upsert: true,
            });
        } catch {}
      }

      return NextResponse.json({ success: true, product: data });
    }

    // 4. Obtener Lista de Deseos compartida (Wishlist de preselección)
    if (action === "get_wishlist") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createServerClient() as any;
      try {
        const { data: file } = await supabase.storage
          .from("product-images")
          .download("_system/cj_wishlist.json");
        const list = file ? JSON.parse(await file.text() || "[]") : [];
        return NextResponse.json({ success: true, wishlist: list });
      } catch {
        return NextResponse.json({ success: true, wishlist: [] });
      }
    }

    // 5. Guardar/Actualizar Lista de Deseos compartida
    if (action === "save_wishlist") {
      const { wishlist } = body;
      if (!Array.isArray(wishlist)) {
        return NextResponse.json({ error: "Wishlist inválida" }, { status: 400 });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createServerClient() as any;
      await supabase.storage
        .from("product-images")
        .upload("_system/cj_wishlist.json", Buffer.from(JSON.stringify(wishlist, null, 2)), {
          contentType: "application/json",
          upsert: true,
        });
      return NextResponse.json({ success: true, wishlist });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (err: any) {
    console.error("Error en /api/admin/cj:", err);
    return NextResponse.json({ error: err.message || "Error al conectar con CJ Dropshipping" }, { status: 500 });
  }
}
