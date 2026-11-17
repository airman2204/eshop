/**
 * ============================================================================
 * FOXDROP SOCIAL COMMERCE — LÓGICA DE APARTADOS E INTENCIÓN EN GRUPOS
 * ============================================================================
 * Recicla la tabla `products` existente y gestiona apartados temporales en
 * `inventory_reservations` para evitar sobreventas durante liquidaciones en vivo.
 */

import { createServerClient } from "@/lib/supabase/server";

export interface ReservationResult {
  success: boolean;
  reason?: "not_found" | "out_of_stock" | "already_reserved" | "db_error";
  reservation?: any;
  product?: {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    image_url?: string;
  };
  availableStock?: number;
}

const INTENT_REGEX =
  /\b(yo|yo\s+lo\s+quiero|lo\s+quiero|mio|mío|me\s+lo\s+llevo|apartamelo|apártamelo|dame\s+uno|quiero\s+uno|pa\s+mi|para\s+mi)\b/i;

/**
 * Detecta si un mensaje en grupo expresa intención de compra y extrae el SKU
 * tanto del mensaje actual como del mensaje citado (reply a foto/post del producto).
 */
export function detectGroupPurchaseIntent(
  text: string,
  quotedText?: string
): { hasIntent: boolean; skuCandidate: string | null } {
  const cleanText = (text || "").trim();
  const cleanQuote = (quotedText || "").trim();

  // Buscar patrón explícito de SKU (ej. [A1B2C3D4], FX-102, o código alfanumérico con al menos un número)
  const skuPattern = /\[([A-Z0-9_-]{4,16})\]|\b([A-Z]{2,6}[-_][A-Z0-9]{2,10})\b|\b(?=[A-Z0-9]*\d)[A-Z0-9]{5,12}\b/i;

  const explicitCmd = cleanText.match(/(?:yo\s+lo\s+quiero|lo\s+quiero|apartar|quiero)\s+\[?([A-Z0-9_-]{3,20})\]?/i);
  if (explicitCmd?.[1]) {
    return { hasIntent: true, skuCandidate: explicitCmd[1].toUpperCase() };
  }

  const hasIntent = INTENT_REGEX.test(cleanText);
  if (!hasIntent) {
    return { hasIntent: false, skuCandidate: null };
  }

  // Si tiene intención natural ("yo", "yo lo quiero", "mío"), buscar SKU en el texto o en el mensaje citado
  const matchInText = cleanText.match(skuPattern);
  const matchInQuote = cleanQuote.match(skuPattern);
  let skuCandidate = (
    matchInText?.[1] || matchInText?.[2] || matchInText?.[0] ||
    matchInQuote?.[1] || matchInQuote?.[2] || matchInQuote?.[0] || ""
  ).replace(/[\[\]]/g, "").toUpperCase() || null;

  // Fallback: si el mensaje citado no trae [SKU], extraer palabras clave reales del producto
  if (!skuCandidate && cleanQuote) {
    const stopWords = new Set([
      "hola", "grupo", "miren", "llego", "llegó", "hoy", "solo", "pieza", "piezas",
      "envio", "envío", "incluido", "esta", "este", "joyita", "tenemos", "disponible",
      "queda", "responde", "mensaje", "para", "apartarlo", "importada", "importado",
    ]);
    const cleanTitle = cleanQuote
      .replace(/[^\w\sáéíóúñ]/gi, " ")
      .trim();
    const words = cleanTitle
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !stopWords.has(w.toLowerCase()));
    if (words.length > 0) {
      skuCandidate = words.slice(0, 2).join(" ");
    }
  }

  return { hasIntent: true, skuCandidate };
}

/**
 * Calcula el stock disponible real: products.stock - SUM(apartados activos no expirados)
 */
export async function getAvailableStock(productId: string): Promise<{ stock: number; reserved: number; available: number }> {
  const supabase = createServerClient();

  const { data: prod } = await (supabase as any)
    .from("products")
    .select("stock")
    .eq("id", productId)
    .maybeSingle();

  const totalStock = Number(prod?.stock ?? 0);

  const { data: activeRes } = await (supabase as any)
    .from("inventory_reservations")
    .select("qty")
    .eq("product_id", productId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());

  const reserved = (activeRes || []).reduce((acc: number, r: any) => acc + Number(r.qty || 1), 0);
  return {
    stock: totalStock,
    reserved,
    available: Math.max(0, totalStock - reserved),
  };
}

/**
 * Busca el producto por SKU (o nombre parcial) y crea un apartado temporal de 20 minutos.
 */
export async function createProductReservation(
  skuOrQuery: string,
  phone: string,
  minutes = 20
): Promise<ReservationResult> {
  const supabase = createServerClient();
  const cleanQuery = skuOrQuery.trim();
  const isUuidPrefix = /^[A-F0-9]{8}$/i.test(cleanQuery);

  let product: any = null;
  if (isUuidPrefix) {
    const { data: allProds } = await (supabase as any).from("products").select("*").limit(200);
    product = (allProds || []).find((p: any) => String(p.id).toUpperCase().startsWith(cleanQuery.toUpperCase())) || null;
  }

  if (!product) {
    const { data: allProds } = await (supabase as any).from("products").select("*").limit(250);
    const queryWords = cleanQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 4);
    let bestMatch: any = null;
    let bestScore = 0;
    for (const p of allProds || []) {
      const title = String(p.title || p.name || "").toLowerCase();
      const score = queryWords.reduce((acc, w) => acc + (title.includes(w) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = p;
      }
    }
    if (bestScore > 0) product = bestMatch;
  }

  if (!product) {
    return { success: false, reason: "not_found" };
  }

  const normalizedProduct = {
    id: product.id,
    name: product.title || product.name || "Producto FoxDrop",
    sku: String(product.id).slice(0, 8).toUpperCase(),
    price: Number(product.public_price ?? product.publicPrice ?? product.price ?? 0),
    stock: Number(product.stock ?? 0),
    image_url: product.image_url,
  };

  // Verificar si este mismo cliente ya tiene un apartado activo para este producto
  const { data: existing } = await (supabase as any)
    .from("inventory_reservations")
    .select("*")
    .eq("product_id", product.id)
    .eq("phone", phone)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (existing) {
    return { success: true, reason: "already_reserved", reservation: existing, product: normalizedProduct };
  }

  const { available } = await getAvailableStock(product.id);
  if (available <= 0) {
    return { success: false, reason: "out_of_stock", product: normalizedProduct, availableStock: 0 };
  }

  const expiresAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

  const { data: reservation, error } = await (supabase as any)
    .from("inventory_reservations")
    .insert({
      product_id: product.id,
      sku: normalizedProduct.sku,
      phone,
      qty: 1,
      status: "active",
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[SocialCommerce] Error creando apartado:", error.message);
    return { success: false, reason: "db_error" };
  }

  return {
    success: true,
    reservation,
    product: normalizedProduct,
    availableStock: available - 1,
  };
}

/**
 * Convierte un apartado activo en orden pagada y descuenta el stock definitivo.
 */
export async function confirmReservationAndDeductStock(reservationId: string, orderId?: string) {
  const supabase = createServerClient();

  const { data: res } = await (supabase as any)
    .from("inventory_reservations")
    .select("*")
    .eq("id", reservationId)
    .maybeSingle();

  if (!res || res.status === "converted") return { success: false };

  // Descontar stock real en products
  const { data: prod } = await (supabase as any)
    .from("products")
    .select("stock")
    .eq("id", res.product_id)
    .maybeSingle();

  const newStock = Math.max(0, Number(prod?.stock ?? 0) - Number(res.qty || 1));
  await (supabase as any)
    .from("products")
    .update({ stock: newStock })
    .eq("id", res.product_id);

  await (supabase as any)
    .from("inventory_reservations")
    .update({ status: "converted", order_id: orderId || null })
    .eq("id", reservationId);

  return { success: true, newStock };
}
