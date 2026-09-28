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
 * Obtener lotes de importación para prorrateo centralizado (sincronizado vía servidor)
 */
export async function getImportBatches() {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_batches" }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }

    // Fallback a cliente navegador
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseBrowserClient() as any;
    const { data, error } = await supabase
      .from("import_batches")
      .select("*")
      .order("received_at", { ascending: false });

    if (error) {
      console.warn("Error al consultar lotes:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn("Fallo de red en lotes:", err);
    return [];
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
 * Obtener listado de clientes con métricas consolidadas (sincronizado vía servidor)
 */
export async function getClientsWithMetrics() {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_clients" }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }

    return [];
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
