import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. Manejo de subida de imágenes multipart/form-data
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any;

    // ─── CONSULTAS GLOBALES (BYPASS RLS PARA COMPARTIR ENTRE TODOS) ───
    if (action === "get_products") {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(id, name, slug, icon)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
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

    if (action === "get_special_orders") {
      const { data, error } = await supabase
        .from("special_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ success: true, data: data || [] });
    }

    // ─── PRODUCTOS ───────────────────────────────────────────────
    if (action === "create_product") {
      if (!product || !product.title) {
        return NextResponse.json({ error: "Datos de producto incompletos" }, { status: 400 });
      }

      let categoryId: string | null = null;
      if (product.categoryName) {
        const { data: catData } = await supabase
          .from("categories")
          .select("id")
          .ilike("name", product.categoryName.trim())
          .maybeSingle();

        if (catData?.id) {
          categoryId = catData.id;
        } else {
          const { data: firstCat } = await supabase.from("categories").select("id").limit(1).maybeSingle();
          categoryId = firstCat?.id || null;
        }
      }

      const sku = product.sku || `FX-${Math.floor(1000 + Math.random() * 9000)}`;

      const { data, error } = await supabase
        .from("products")
        .insert([
          {
            sku,
            title: product.title,
            description: "Artículo verificado por FoxDrop.",
            category_id: categoryId,
            base_cost_usd: product.baseCostUsd || 0,
            base_cost_mxn: product.baseCostMxn || 0,
            shipping_cost_allocated: product.shippingCostAllocated || 0,
            public_price: product.publicPrice || 0,
            stock: product.stock ?? 0,
            images: product.imageUrl ? [product.imageUrl] : ["https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800"],
            is_active: true,
          },
        ])
        .select("*, categories(id, name, slug, icon)")
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "update_product") {
      if (!id || !product) {
        return NextResponse.json({ error: "ID y datos requeridos" }, { status: 400 });
      }

      const payload: any = { updated_at: new Date().toISOString() };
      if (product.title !== undefined) payload.title = product.title;
      if (product.sku !== undefined) payload.sku = product.sku;
      if (product.baseCostUsd !== undefined) payload.base_cost_usd = product.baseCostUsd;
      if (product.baseCostMxn !== undefined) payload.base_cost_mxn = product.baseCostMxn;
      if (product.shippingCostAllocated !== undefined) payload.shipping_cost_allocated = product.shippingCostAllocated;
      if (product.publicPrice !== undefined) payload.public_price = product.publicPrice;
      if (product.stock !== undefined) payload.stock = product.stock;
      if (product.imageUrl) payload.images = [product.imageUrl];

      const { data, error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", id)
        .select("*, categories(id, name, slug, icon)")
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "delete_product") {
      if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true, deletedId: id });
    }

    if (action === "delete_all_mock_products") {
      const { error } = await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      return NextResponse.json({ success: true, message: "Todos los productos eliminados de la base de datos." });
    }

    // ─── LOTES DE IMPORTACIÓN ─────────────────────────────────────
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

    if (action === "delete_batch") {
      if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
      const { error } = await supabase.from("import_batches").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true, deletedId: id });
    }

    // ─── AUTH ADMIN ──────────────────────────────────────────────
    if (action === "update_password") {
      if (!email || !password) {
        return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existingProfile) {
        await supabase
          .from("profiles")
          .update({
            admin_password_hash: password,
            role: "admin",
            must_change_password: false,
            updated_at: new Date().toISOString(),
          })
          .eq("email", normalizedEmail);
      }

      return NextResponse.json({ success: true, email: normalizedEmail });
    }

    if (action === "verify_password") {
      if (!email || !password) {
        return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const { data: profile } = await supabase
        .from("profiles")
        .select("admin_password_hash, must_change_password")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (profile && profile.admin_password_hash) {
        if (profile.admin_password_hash === password) {
          return NextResponse.json({
            valid: true,
            mustChangePassword: profile.must_change_password ?? false,
          });
        }
        return NextResponse.json({ valid: false });
      }

      return NextResponse.json({ valid: null });
    }

    // ─── CARRUSEL HERO ───────────────────────────────────────────
    if (action === "delete_slide") {
      if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
      const { error } = await supabase.from("carousel_slides").delete().eq("id", id);
      if (error) throw error;
      return NextResponse.json({ success: true, deletedId: id });
    }

    if (action === "create_slide") {
      const { slide } = body;
      const { data, error } = await supabase.from("carousel_slides").insert([slide]).select().single();
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "get_slides") {
      const { data, error } = await supabase
        .from("carousel_slides")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) {
        return NextResponse.json({ success: true, data: [] });
      }
      return NextResponse.json({ success: true, data: data || [] });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (err: any) {
    console.error("Error en /api/admin:", err);
    return NextResponse.json({ error: err.message || "Error interno del servidor" }, { status: 500 });
  }
}
