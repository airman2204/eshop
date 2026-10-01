import { getSupabaseBrowserClient } from "./supabase/client";
import { Product, ClubFoxDropTier, ClubFoxDropSettings } from "@/types";

export const DEFAULT_CLUB_SETTINGS: ClubFoxDropSettings = {
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

export const CLUB_FOXDROP_TIERS: ClubFoxDropTier[] = DEFAULT_CLUB_SETTINGS.tiers;

/**
 * Calcula puntos ganados según configuración dinámica ($X MXN = 1 punto/estrella)
 */
export function calculateEarnedPoints(totalMxn: number, pesosPerPoint: number = 10): number {
  const rate = pesosPerPoint > 0 ? pesosPerPoint : 10;
  return Math.floor(totalMxn / rate);
}

/**
 * Obtiene el nivel del cliente según sus puntos en Club Foxdrop (acepta niveles configurados)
 */
export function getClubFoxDropTier(points: number, tiers: ClubFoxDropTier[] = DEFAULT_CLUB_SETTINGS.tiers): ClubFoxDropTier {
  const activeTiers = tiers && tiers.length > 0 ? tiers : DEFAULT_CLUB_SETTINGS.tiers;
  const sorted = [...activeTiers].sort((a, b) => b.minPoints - a.minPoints);
  return sorted.find((tier) => points >= tier.minPoints) || sorted[sorted.length - 1];
}

/**
 * Suma puntos al perfil del usuario tras completar una compra
 */
export async function addClubFoxDropPoints(userId: string, pointsEarned: number) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseBrowserClient() as any;
    const { data: profile } = await supabase
      .from("profiles")
      .select("loyalty_points")
      .eq("id", userId)
      .single();

    const currentPoints = profile?.loyalty_points || 0;
    const newPoints = currentPoints + pointsEarned;

    await supabase
      .from("profiles")
      .update({ loyalty_points: newPoints })
      .eq("id", userId);

    return newPoints;
  } catch (err) {
    console.warn("No se pudieron sumar puntos de Club Foxdrop:", err);
    return null;
  }
}

/**
 * Motor de recomendaciones cruzadas inteligentes con IA/heurística:
 * Sugiere productos complementarios basándose en la categoría actual y exclusión del producto actual.
 */
export function getCrossSellRecommendations(
  currentProduct: Product,
  allProducts: Product[],
  limit = 3
): Product[] {
  // 1. Filtrar otros productos en stock
  const candidates = allProducts.filter(
    (p) => p.id !== currentProduct.id && p.stock > 0
  );

  // 2. Priorizar complementarios por categoría o productos populares
  const sameCategory = candidates.filter((p) => p.category === currentProduct.category);
  const otherCategories = candidates.filter((p) => p.category !== currentProduct.category);

  const recommended = [...sameCategory, ...otherCategories];
  return recommended.slice(0, limit);
}
