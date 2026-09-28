import { getSupabaseBrowserClient } from "./supabase/client";
import { Product } from "@/types";

export interface ClubFoxDropTier {
  name: string;
  minPoints: number;
  discountPercent: number;
  badge: string;
}

export const CLUB_FOXDROP_TIERS: ClubFoxDropTier[] = [
  { name: "Miembro Bronce", minPoints: 0, discountPercent: 0, badge: "🥉" },
  { name: "Miembro Plata", minPoints: 500, discountPercent: 3, badge: "🥈" },
  { name: "Miembro Oro", minPoints: 1500, discountPercent: 7, badge: "🥇" },
  { name: "Miembro Platino Fox", minPoints: 3000, discountPercent: 12, badge: "👑" },
];

/**
 * 1 punto por cada $10 MXN gastados
 */
export function calculateEarnedPoints(totalMxn: number): number {
  return Math.floor(totalMxn / 10);
}

/**
 * Obtiene el nivel del cliente según sus puntos en Club Foxdrop
 */
export function getClubFoxDropTier(points: number): ClubFoxDropTier {
  const sorted = [...CLUB_FOXDROP_TIERS].sort((a, b) => b.minPoints - a.minPoints);
  return sorted.find((tier) => points >= tier.minPoints) || CLUB_FOXDROP_TIERS[0];
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
