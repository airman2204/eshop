/**
 * ============================================================================
 * FOXDROP — REPOSITORIO & SERVICIOS DE PRODUCTOS
 * ============================================================================
 * Maneja el mapeo desde el esquema de base de datos de Supabase hacia el modelo
 * de la aplicación, incluyendo cálculo reactivo de márgenes y sincronización.
 */

import { getSupabaseBrowserClient } from "./supabase/client";
import { Product } from "@/types";
import { translateVariantName } from "./translateVariant";

/**
 * Esquema crudo devuelto por la tabla `public.products` de Supabase.
 */
export interface DatabaseProduct {
  id: string;
  sku: string;
  title: string;
  description: string | null;
  category_id: string | null;
  base_cost_usd: number;
  base_cost_mxn: number;
  shipping_cost_allocated: number;
  total_cost_mxn: number;
  public_price: number;
  profit_unit: number;
  stock: number;
  is_special_order: boolean;
  images: string[];
  is_active: boolean;
  days_in_stock: number;
  expiration_date: string | null;
  brand?: string | null;
  is_combo?: boolean;
  combo_product_ids?: string[] | null;
  discount_percent?: number | null;
  videos?: string[] | null;
  variants?: any[] | null;
  categories?: {
    id: string;
    name: string;
    slug: string;
    icon: string;
  } | null;
}

/**
 * Mapea un registro crudo de Supabase a la estructura limpia de Product en React.
 * Calcula automáticamente el margen porcentual y provee fallbacks para imágenes.
 */

export function detectProductBrand(title: string, currentBrand?: string | null): string {
  if (currentBrand && currentBrand.trim()) return currentBrand.trim();
  const lower = (title || '').toLowerCase();
  if (lower.includes('bath & body') || lower.includes('bath and body') || lower.includes('bbw') || lower.includes('gingham') || lower.includes('champagne toast') || lower.includes('japanese cherry') || lower.includes('warm vanilla sugar') || lower.includes('3-wick') || lower.includes('mahogany teakwood')) {
    return 'Bath & Body Works';
  }
  if (lower.includes('victoria') || lower.includes('pink ') || lower.includes('bare vanilla') || lower.includes('pure seduction') || lower.includes('velvet petals') || lower.includes('love spell')) {
    return "Victoria's Secret";
  }
  if (lower.includes('nike') || lower.includes('jordan') || lower.includes('dunk') || lower.includes('air max') || lower.includes('air force')) {
    return 'Nike';
  }
  if (lower.includes('adidas') || lower.includes('yeezy') || lower.includes('samba') || lower.includes('campus') || lower.includes('gazelle')) {
    return 'Adidas';
  }
  if (lower.includes('zara')) return 'Zara';
  if (lower.includes('coach')) return 'Coach';
  if (lower.includes('stanley')) return 'Stanley';
  return 'FoxDrop Oficial';
}

export function mapDbProductToApp(dbProd: any): Product {
  const publicPrice = Number(dbProd.public_price ?? dbProd.publicPrice) || 0;
  const baseCostMxn = Number(dbProd.base_cost_mxn ?? dbProd.baseCostMxn) || 0;
  const shippingCostAllocated = Number(dbProd.shipping_cost_allocated ?? dbProd.shippingCostAllocated) || 0;
  const totalCost = Number(dbProd.total_cost_mxn ?? dbProd.totalCostMxn) || (baseCostMxn + shippingCostAllocated);
  const profitUnit = Number(dbProd.profit_unit ?? dbProd.profitUnit) || Math.max(0, publicPrice - totalCost);
  const marginPercent = publicPrice > 0 ? ((publicPrice - totalCost) / publicPrice) * 100 : 0;

  return {
    id: String(dbProd.id || ('prod_' + Date.now())),
    sku: dbProd.sku || "",
    title: dbProd.title || "Sin título",
    description: dbProd.description || "",
    category: dbProd.categories?.name || dbProd.category || "General",
    baseCostUsd: Number(dbProd.base_cost_usd ?? dbProd.baseCostUsd) || 0,
    baseCostMxn,
    shippingCostAllocated,
    totalCostMxn: totalCost,
    publicPrice,
    profitUnit,
    marginPercent: Number(marginPercent.toFixed(2)),
    stock: Number(dbProd.stock) || 0,
    isSpecialOrder: Boolean(dbProd.is_special_order ?? dbProd.isSpecialOrder),
    images: Array.isArray(dbProd.images) && dbProd.images.length > 0 && !dbProd.images[0].includes('photo-1523275335684') && !dbProd.images[0].includes('photo-1546868871')
      ? dbProd.images 
      : (dbProd.imageUrl ? [dbProd.imageUrl] : ["/no-image.svg"]),
    daysInStock: Number(dbProd.days_in_stock ?? dbProd.daysInStock) || 0,
    expirationDate: dbProd.expiration_date || dbProd.expirationDate || undefined,
    isCombo: Boolean(dbProd.is_combo ?? dbProd.isCombo),
    comboProductIds: Array.isArray(dbProd.combo_product_ids) ? dbProd.combo_product_ids : (Array.isArray(dbProd.comboProductIds) ? dbProd.comboProductIds : []),
    createdAt: dbProd.created_at || dbProd.createdAt || undefined,
    discountPercent: Number(dbProd.discount_percent ?? dbProd.discountPercent) || 0,
    isActive: dbProd.is_active ?? dbProd.isActive ?? true,
    brand: detectProductBrand(dbProd.title || '', dbProd.brand),
    videos: Array.isArray(dbProd.videos) ? dbProd.videos : [],
    variants: Array.isArray(dbProd.variants) ? dbProd.variants.map((v: any) => ({ ...v, name: translateVariantName(v.name || v.variantName || v.variantKey || v.variantNameEn || "") })) : [],
  };
}

export interface ClientBootstrapData {
  products: Product[];
  storeSettings?: any;
  checkoutSettings?: any;
  slides?: any[];
  clubSettings?: any;
  brands?: any[];
}

/**
 * Carga inicial consolidada de toda la información pública de la tienda
 * en una sola petición paralela ultrarrápida.
 */
export async function getClientBootstrap(includeInactive = false): Promise<ClientBootstrapData | null> {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_client_bootstrap", includeInactive }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.products) {
        return {
          products: (json.data.products as DatabaseProduct[]).map(mapDbProductToApp),
          storeSettings: json.data.storeSettings,
          checkoutSettings: json.data.checkoutSettings,
          slides: json.data.slides || [],
          clubSettings: json.data.clubSettings,
          brands: json.data.brands || [],
        };
      }
    }
  } catch (err) {
    console.warn("Fallo en getClientBootstrap, recurriendo a getActiveProducts:", err);
  }

  // Fallback seguro si falla el bootstrap
  const fallbackProds = await getActiveProducts(includeInactive);
  return {
    products: fallbackProds || [],
  };
}

/**
 * Obtener todos los productos desde Supabase de forma sincronizada.
 * @param includeInactive - Si es true, incluye los productos apagados (para el panel admin).
 *                          Si es false, solo devuelve los encendidos (para la tienda pública).
 */
export async function getActiveProducts(includeInactive = false): Promise<Product[] | null> {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_products", includeInactive }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        return (json.data as DatabaseProduct[]).map(mapDbProductToApp);
      }
    }

    // Fallback directo a Supabase browser client si la ruta API no responde
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseBrowserClient() as any;
    let query = supabase
      .from("products")
      .select("*, categories(id, name, slug, icon)")
      .order("created_at", { ascending: false });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error al obtener productos de Supabase:", error);
      return [];
    }

    return (data as DatabaseProduct[]).map(mapDbProductToApp);
  } catch (err) {
    console.error("Fallo al consultar productos:", err);
    return [];
  }
}

/**
 * Obtener categorías activas
 */
export async function getCategories() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseBrowserClient() as any;
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error al obtener categorias:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Fallo de red al consultar categorias:", err);
    return [];
  }
}

/**
 * Suscripción en Tiempo Real para cambios en productos (INSERT, UPDATE, DELETE).
 * Permite que la tienda /tienda y el admin se actualicen al instante sin refrescar la página.
 */
export function subscribeToProductsChange(onChange: () => void) {
  try {
    const supabase = getSupabaseBrowserClient() as any;
    const channelName = `products-realtime-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          onChange();
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  } catch (err) {
    console.warn('No se pudo inicializar la suscripción de realtime a productos:', err);
    return () => {};
  }
}
