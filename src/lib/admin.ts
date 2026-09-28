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
 * Inserta un producto nuevo en Supabase usando la ruta segura del servidor
 */
export async function createProductInDb(input: NewProductInput) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create_product", product: input }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al crear producto en la base de datos");
  }

  const json = await res.json();
  return json.data;
}

/**
 * Actualizar un producto existente en Supabase usando la ruta segura del servidor
 */
export async function updateProductInDb(id: string, updates: Partial<NewProductInput>) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update_product", id, product: updates }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al actualizar producto en la base de datos");
  }

  const json = await res.json();
  return json.data;
}

/**
 * Elimina un producto de Supabase de manera definitiva usando la API segura de servidor
 */
export async function deleteProductInDb(id: string) {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_product", id }),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Error al eliminar producto");
    }
    return true;
  } catch (err) {
    console.error("Error en deleteProductInDb:", err);
    throw err;
  }
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
 * Registrar un nuevo lote de importación usando la ruta segura del servidor
 */
export async function createImportBatch(batch: {
  batchName: string;
  totalShippingCost: number;
  totalUnits: number;
  notes?: string;
}) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create_batch", batch }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al crear lote en la base de datos");
  }

  const json = await res.json();
  return json.data;
}

/**
 * Elimina un lote de importación de Supabase usando la ruta segura del servidor
 */
export async function deleteImportBatch(id: string) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete_batch", id }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al eliminar lote");
  }

  return true;
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

// ─── CARRUSEL HERO ────────────────────────────────────────────────────────────

export interface CarouselSlide {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  cta_text: string;
  cta_category: string;
  sort_order: number;
  is_active: boolean;
}

export async function getCarouselSlides(): Promise<CarouselSlide[]> {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_slides" }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

export async function createCarouselSlide(slide: Omit<CarouselSlide, "id" | "is_active">) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create_slide", slide: { ...slide, is_active: true } }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al crear slide");
  }
  const json = await res.json();
  return json.data as CarouselSlide;
}

export async function deleteCarouselSlide(id: string) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete_slide", id }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al eliminar slide");
  }
  return true;
}
