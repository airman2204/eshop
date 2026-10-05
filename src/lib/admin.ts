/**
 * ============================================================================
 * FOXDROP — SERVICIOS Y REPOSITORIO DE CONTROL ADMINISTRATIVO & CRM
 * ============================================================================
 * Funciones de alta, baja, cambio de productos, prorrateo de lotes de importación,
 * consulta de cotización cambiaria USD en vivo y métricas contables.
 */

import { getSupabaseBrowserClient } from "./supabase/client";
import { AbandonedCart, ClubFoxDropSettings, LoyaltyMetrics } from "@/types";

/**
 * Consulta el tipo de cambio oficial USD a MXN en tiempo real con redundancia de APIs financieras.
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
  images?: string[];
  sku?: string;
  isCombo?: boolean;
  comboProductIds?: string[];
  isActive?: boolean;
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
 * Cambia la categoría de múltiples productos de forma simultánea.
 */
export async function bulkUpdateProductsCategory(productIds: string[], categoryName: string) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "bulk_update_category", productIds, categoryName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al actualizar categorías en lote");
  }

  const json = await res.json();
  return json;
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

export async function deleteClientFromDb(clientId: string, clientEmail?: string, clientPhone?: string, deleteOrders: boolean = false) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "delete_client",
      clientId,
      clientEmail,
      clientPhone,
      deleteOrders,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Error al eliminar cliente");
  }

  return true;
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

export async function fetchAdminCategories(): Promise<{ id: string; name: string; slug: string }[]> {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_categories" }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

export async function createAdminCategory(name: string): Promise<{ id: string; name: string; slug: string }> {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create_category", name }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al registrar categoría");
  }
  const json = await res.json();
  return json.data;
}

// ─── CARRITOS ABANDONADOS ─────────────────────────────────────────────────────

export async function getAdminAbandonedCarts(): Promise<AbandonedCart[]> {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_abandoned_carts" }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("Error al obtener carritos abandonados:", err);
    return [];
  }
}

export async function updateAdminAbandonedCart(cartId: string, followedUp: boolean): Promise<boolean> {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_abandoned_cart", cartId, followedUp }),
    });
    return res.ok;
  } catch (err) {
    console.error("Error actualizando carrito abandonado:", err);
    return false;
  }
}

export async function deleteAdminAbandonedCart(id: string): Promise<boolean> {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_abandoned_cart", id }),
    });
    return res.ok;
  } catch (err) {
    console.error("Error eliminando carrito abandonado:", err);
    return false;
  }
}

export async function createTestAbandonedCart(): Promise<boolean> {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_test_abandoned_cart" }),
    });
    return res.ok;
  } catch (err) {
    console.error("Error creando carrito de prueba:", err);
    return false;
  }
}

// ─── CONFIGURACIÓN CLUB FOXDROP & MÉTRICAS DE FIDELIDAD ────────────────────────

export async function getClubSettings(): Promise<ClubFoxDropSettings> {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_club_settings" }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.settings) return json.settings;
    }
  } catch (err) {
    console.warn("Fallo cargando configuración de club:", err);
  }
  return {
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
}

export async function saveClubSettings(settings: ClubFoxDropSettings): Promise<boolean> {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_club_settings", settings }),
    });
    return res.ok;
  } catch (err) {
    console.error("Error guardando configuración de club:", err);
    return false;
  }
}

export async function getLoyaltyMetrics(): Promise<LoyaltyMetrics | null> {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_loyalty_metrics" }),
    });
    if (res.ok) {
      const json = await res.json();
      return json.metrics || null;
    }
    return null;
  } catch (err) {
    console.error("Error cargando métricas de lealtad:", err);
    return null;
  }
}

/**
 * Genera una imagen oficial de ticket de compra con branding 3D FoxDrop
 */
export async function generateTicketImage(ticket: any): Promise<{ imageUrl: string; base64: string } | null> {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generate_ticket_image", ticket }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        return {
          imageUrl: json.imageUrl,
          base64: json.base64,
        };
      }
    }
    return null;
  } catch (err) {
    console.error("Fallo generando imagen de ticket:", err);
    return null;
  }
}

// ─── FOXBOT AI AGENT ─────────────────────────────────────────────────────────

export async function generateAgentSocialPost(params: {
  productTitle: string;
  productCategory?: string;
  price: number;
  discountPercent?: number;
  platform: string;
  tone?: string;
  audience?: string;
}) {
  const res = await fetch("/api/admin/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "generate_social_post", ...params }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al generar publicación");
  return data.post;
}

export async function generateAgentOrderFollowup(params: {
  orderNumber: string;
  clientName: string;
  status: string;
  total: number;
  daysSinceCreated: number;
  trackingNumber?: string;
}) {
  const res = await fetch("/api/admin/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "generate_order_followup", ...params }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al redactar seguimiento");
  return data.message;
}

export async function generateAgentCartRecovery(params: {
  clientName: string;
  itemsSummary: string;
  total: number;
  discountCode?: string;
}) {
  const res = await fetch("/api/admin/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "generate_cart_recovery", ...params }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al redactar mensaje");
  return data.message;
}

export async function chatWithFoxBot(userMessage: string, history: Array<{ sender: string; text: string }>) {
  const res = await fetch("/api/admin/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "chat", userMessage, history }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al consultar a FoxBot");
  return data.reply;
}


