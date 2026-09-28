import { getSupabaseBrowserClient } from "./supabase/client";

/**
 * Consulta el tipo de cambio oficial USD a MXN en tiempo real con redundancia de APIs financieras
 */
export async function getLiveExchangeRate(): Promise<number> {
  const endpoints = [
    "https://api.exchangerate-api.com/v4/latest/USD",
    "https://open.er-api.com/v6/latest/USD",
    "https://api.fxratesapi.com/latest?base=USD"
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      if (data && data.rates && typeof data.rates.MXN === "number") {
        const rate = Number(data.rates.MXN.toFixed(2));
        if (rate > 10 && rate < 30) {
          return rate;
        }
      }
    } catch {
      // Intentar con el siguiente proveedor
    }
  }

  // Fallback representativo del mercado actual
  return 17.74;
}


export interface NewProductInput {
  title: string;
  categoryName: string;
  baseCostUsd: number;
  baseCostMxn: number;
  shippingCostAllocated: number;
  publicPrice: number;
  stock: number;
  imageUrl?: string;
  sku?: string;
}

/**
 * Inserta un producto nuevo en Supabase
 */
export async function createProductInDb(input: NewProductInput) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;

  // 1. Obtener el ID de la categoría por su nombre o crearla
  let categoryId: string | null = null;
  const { data: catData } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", input.categoryName.trim())
    .single();

  if (catData?.id) {
    categoryId = catData.id;
  } else {
    // Si no existe, tomar la primera disponible
    const { data: firstCat } = await supabase.from("categories").select("id").limit(1).single();
    categoryId = firstCat?.id || null;
  }

  const sku = input.sku || `FX-${Math.floor(1000 + Math.random() * 9000)}`;

  const { data, error } = await supabase
    .from("products")
    .insert([
      {
        sku,
        title: input.title,
        description: "Artículo importado verificado por FoxDrop.",
        category_id: categoryId,
        base_cost_usd: input.baseCostUsd,
        base_cost_mxn: input.baseCostMxn,
        shipping_cost_allocated: input.shippingCostAllocated,
        public_price: input.publicPrice,
        stock: input.stock,
        images: input.imageUrl ? [input.imageUrl] : ["https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800"],
        is_active: true,
      },
    ])
    .select("*, categories(id, name, slug, icon)")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Actualizar un producto existente en Supabase
 */
export async function updateProductInDb(id: string, updates: Partial<NewProductInput>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.sku !== undefined) payload.sku = updates.sku;
  if (updates.baseCostUsd !== undefined) payload.base_cost_usd = updates.baseCostUsd;
  if (updates.baseCostMxn !== undefined) payload.base_cost_mxn = updates.baseCostMxn;
  if (updates.shippingCostAllocated !== undefined) payload.shipping_cost_allocated = updates.shippingCostAllocated;
  if (updates.publicPrice !== undefined) payload.public_price = updates.publicPrice;
  if (updates.stock !== undefined) payload.stock = updates.stock;
  if (updates.imageUrl) payload.images = [updates.imageUrl];

  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id)
    .select("*, categories(id, name, slug, icon)")
    .single();

  if (error) {
    console.error("Error al actualizar producto en Supabase:", error);
    throw error;
  }
  return data;
}

/**
 * Elimina un producto en Supabase (Soft delete poniendo is_active = false)
 */
export async function deleteProductInDb(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;
  const { error } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Error al eliminar producto:", error);
    throw error;
  }
  return true;
}

/**
 * Obtener lotes de importación para prorrateo centralizado
 */
export async function getImportBatches() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseBrowserClient() as any;
    const { data, error } = await supabase
      .from("import_batches")
      .select("*")
      .order("received_at", { ascending: false });

    if (error) {
      console.warn("Error al consultar lotes:", error);
      return null;
    }
    return data || [];
  } catch (err) {
    console.warn("Fallo de red en lotes:", err);
    return null;
  }
}

/**
 * Registrar un nuevo lote de importación
 */
export async function createImportBatch(batch: {
  batchName: string;
  totalShippingCost: number;
  totalUnits: number;
  notes?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;
  const { data, error } = await supabase
    .from("import_batches")
    .insert([
      {
        batch_name: batch.batchName,
        total_shipping_cost: batch.totalShippingCost,
        total_units: batch.totalUnits,
        notes: batch.notes || null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Elimina un lote de importación de Supabase
 */
export async function deleteImportBatch(id: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseBrowserClient() as any;
    const { error } = await supabase
      .from("import_batches")
      .delete()
      .eq("id", id);

    if (error) {
      console.warn("Advertencia al eliminar lote en Supabase:", error);
    }
    return true;
  } catch (err) {
    console.warn("Fallo de red al eliminar lote:", err);
    return true;
  }
}


/**
 * Obtener listado de clientes con métricas consolidadas (pedidos, gasto total, puntos)
 */
export async function getClientsWithMetrics() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseBrowserClient() as any;
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profErr) console.warn("Error al consultar profiles:", profErr);

    const { data: orders, error: ordErr } = await supabase
      .from("orders")
      .select("id, client_name, client_phone, client_email, total, status, created_at");

    if (ordErr) console.warn("Error al consultar orders:", ordErr);

    // Mapear clientes tanto desde profiles como desde los pedidos únicos realizados
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientMap = new Map<string, any>();

    // 1. Añadir perfiles registrados
    (profiles || []).forEach((p: { phone: string; email: string; id: string; full_name: string; loyalty_points: number; role: string; created_at: string }) => {
      const key = (p.phone || p.email || p.id).trim().toLowerCase();
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          id: p.id,
          name: p.full_name || 'Cliente FoxDrop',
          phone: p.phone || 'Sin teléfono',
          email: p.email || 'Sin correo',
          role: p.role || 'client',
          loyaltyPoints: p.loyalty_points || 0,
          ordersCount: 0,
          totalSpent: 0,
          registeredAt: p.created_at,
          orders: [],
        });
      }
    });

    // 2. Acumular pedidos e incorporar clientes que hayan comprado sin cuenta previa
    (orders || []).forEach((o: { client_phone: string; client_email?: string; client_name: string; total: number; id: string; status: string; created_at: string }) => {
      const key = (o.client_phone || o.client_email || '').trim().toLowerCase();
      if (!key) return;

      if (!clientMap.has(key)) {
        clientMap.set(key, {
          id: `cli-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: o.client_name || 'Cliente',
          phone: o.client_phone || 'Sin teléfono',
          email: o.client_email || 'Sin correo',
          role: 'client',
          loyaltyPoints: Math.floor((Number(o.total) || 0) / 10),
          ordersCount: 0,
          totalSpent: 0,
          registeredAt: o.created_at,
          orders: [],
        });
      }

      const client = clientMap.get(key);
      client.ordersCount += 1;
      if (o.status !== 'cancelled') {
        client.totalSpent += Number(o.total) || 0;
      }
      client.orders.push(o);
    });

    return Array.from(clientMap.values());
  } catch (err) {
    console.error("Fallo obteniendo clientes:", err);
    return [];
  }
}

