import { getSupabaseBrowserClient } from "./supabase/client";
import { Product } from "@/types";

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
  categories?: {
    id: string;
    name: string;
    slug: string;
    icon: string;
  } | null;
}

export function mapDbProductToApp(dbProd: DatabaseProduct): Product {
  const publicPrice = Number(dbProd.public_price) || 0;
  const totalCost = Number(dbProd.total_cost_mxn) || 0;
  const marginPercent = publicPrice > 0 ? ((publicPrice - totalCost) / publicPrice) * 100 : 0;

  return {
    id: dbProd.id,
    sku: dbProd.sku || "",
    title: dbProd.title,
    description: dbProd.description || "",
    category: dbProd.categories?.name || "General",
    baseCostUsd: Number(dbProd.base_cost_usd) || 0,
    baseCostMxn: Number(dbProd.base_cost_mxn) || 0,
    shippingCostAllocated: Number(dbProd.shipping_cost_allocated) || 0,
    totalCostMxn: totalCost,
    publicPrice,
    profitUnit: Number(dbProd.profit_unit) || 0,
    marginPercent: Number(marginPercent.toFixed(2)),
    stock: dbProd.stock,
    isSpecialOrder: dbProd.is_special_order,
    images: dbProd.images && dbProd.images.length > 0 ? dbProd.images : ["/file.svg"],
    daysInStock: dbProd.days_in_stock || 0,
    expirationDate: dbProd.expiration_date || undefined,
  };
}

/**
 * Obtener todos los productos activos desde Supabase
 */
export async function getActiveProducts(): Promise<Product[] | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseBrowserClient() as any;
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(id, name, slug, icon)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al obtener productos de Supabase:", error);
      return null;
    }

    return (data as DatabaseProduct[]).map(mapDbProductToApp);
  } catch (err) {
    console.error("Fallo de red al consultar productos:", err);
    return null;
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
