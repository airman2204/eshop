/**
 * MOTOR DE COSTEO Y ASISTENTE INTELIGENTE DE PRECIOS PARA FOXDROP
 * Incluye la matriz de prorrateo por peso del Lote 3 y precios de referencia del mercado en México
 */

export interface FreightCategoryRule {
  key: string;
  label: string;
  keywords: string[];
  weightG: number;
  allocatedFreightMxn: number; // Basado en el prorrateo real del Lote 3 ($5,600 MXN / 119 pzas)
  mexicoMarketRefMin: number;  // Precio en tiendas departamentales / oficiales México
  mexicoMarketRefMax: number;
  defaultSalePrice: number;    // Precio comercial sugerido "punto dulce"
}

export const LOTE3_FREIGHT_RULES: FreightCategoryRule[] = [
  {
    key: "three_wick",
    label: "Vela 3 Mechas (14.5 oz / Vidrio Pesado)",
    keywords: ["3 mechas", "3-wick", "3 wick", "tres mechas"],
    weightG: 750,
    allocatedFreightMxn: 163,
    mexicoMarketRefMin: 650,
    mexicoMarketRefMax: 750,
    defaultSalePrice: 599,
  },
  {
    key: "single_wick",
    label: "Vela 1 Mecha (8 oz / Tarro Vidrio)",
    keywords: ["1 mecha", "single wick", "single-wick", "una mecha"],
    weightG: 410,
    allocatedFreightMxn: 89,
    mexicoMarketRefMin: 420,
    mexicoMarketRefMax: 490,
    defaultSalePrice: 399,
  },
  {
    key: "foam_soap",
    label: "Jabón Espuma / Líquido (259 ml / 8.75 oz)",
    keywords: ["jabón", "jabon", "soap", "foaming", "espuma"],
    weightG: 330,
    allocatedFreightMxn: 72,
    mexicoMarketRefMin: 280,
    mexicoMarketRefMax: 350,
    defaultSalePrice: 259,
  },
  {
    key: "full_mist",
    label: "Mist / Loción Grande (8 oz / 236 ml)",
    keywords: ["mist", "fragrance mist", "bruma", "perfume mist", "loción", "locion"],
    weightG: 280,
    allocatedFreightMxn: 61,
    mexicoMarketRefMin: 449,
    mexicoMarketRefMax: 600,
    defaultSalePrice: 379,
  },
  {
    key: "full_cream",
    label: "Crema Corporal Grande (8 oz / 226 g)",
    keywords: ["body cream", "crema corporal", "ultimate hydration", "body lotion", "crema 8oz"],
    weightG: 265,
    allocatedFreightMxn: 58,
    mexicoMarketRefMin: 420,
    mexicoMarketRefMax: 550,
    defaultSalePrice: 369,
  },
  {
    key: "scrub",
    label: "Exfoliante Corporal (7.4 oz / 210 g)",
    keywords: ["scrub", "exfoliante", "glow scrub"],
    weightG: 250,
    allocatedFreightMxn: 54,
    mexicoMarketRefMin: 450,
    mexicoMarketRefMax: 560,
    defaultSalePrice: 389,
  },
  {
    key: "shimmer_mist",
    label: "Shimmer Mist Especial (145 ml / 4.9 oz)",
    keywords: ["shimmer", "diamond shimmer"],
    weightG: 180,
    allocatedFreightMxn: 39,
    mexicoMarketRefMin: 430,
    mexicoMarketRefMax: 520,
    defaultSalePrice: 359,
  },
  {
    key: "wallflowers_duo",
    label: "Wallflowers Repuestos Dúo 2-Pack",
    keywords: ["wallflowers", "wallflower", "bulbos", "2-pack", "2 pack", "refills"],
    weightG: 150,
    allocatedFreightMxn: 33,
    mexicoMarketRefMin: 380,
    mexicoMarketRefMax: 450,
    defaultSalePrice: 349,
  },
  {
    key: "travel_mist",
    label: "Mist Tamaño Viaje (75 ml / 2.5 oz)",
    keywords: ["travel mist", "mist viaje", "viaje mist", "2.5 fl oz", "2.5 oz"],
    weightG: 105,
    allocatedFreightMxn: 23,
    mexicoMarketRefMin: 220,
    mexicoMarketRefMax: 280,
    defaultSalePrice: 219,
  },
  {
    key: "travel_cream",
    label: "Crema Tamaño Viaje (70 g / 2.5 oz)",
    keywords: ["travel size body cream", "crema viaje", "viaje crema", "70 g", "70g"],
    weightG: 95,
    allocatedFreightMxn: 20,
    mexicoMarketRefMin: 190,
    mexicoMarketRefMax: 250,
    defaultSalePrice: 199,
  },
  {
    key: "nightlight_plug",
    label: "Difusor de Pared con Luz Nocturna",
    keywords: ["nightlight", "scent control", "difusor luz", "plug luz"],
    weightG: 95,
    allocatedFreightMxn: 21,
    mexicoMarketRefMin: 350,
    mexicoMarketRefMax: 480,
    defaultSalePrice: 329,
  },
  {
    key: "basic_plug",
    label: "Difusor de Pared Básico (Plugs)",
    keywords: ["wallflowers plug", "difusor pared", "flare plug", "plug"],
    weightG: 55,
    allocatedFreightMxn: 12,
    mexicoMarketRefMin: 180,
    mexicoMarketRefMax: 240,
    defaultSalePrice: 179,
  },
  {
    key: "pocketbac",
    label: "Gel Antibacterial PocketBac (29 ml / 1 fl oz)",
    keywords: ["pocketbac", "gel antibacterial", "gel de manos", "sanitizer", "29 ml", "29ml"],
    weightG: 45,
    allocatedFreightMxn: 10,
    mexicoMarketRefMin: 59,
    mexicoMarketRefMax: 79,
    defaultSalePrice: 69,
  },
  {
    key: "pocketbac_holder",
    label: "Porta Gel PocketBac (Holders / Mascotas)",
    keywords: ["pocketbac holder", "porta gel", "holder gel", "clip gel"],
    weightG: 35,
    allocatedFreightMxn: 9,
    mexicoMarketRefMin: 220,
    mexicoMarketRefMax: 290,
    defaultSalePrice: 219,
  },
  {
    key: "car_holder",
    label: "Sujetador / Clip para Auto (Holders)",
    keywords: ["car fragrance holder", "clip auto", "holder auto", "sujetador auto"],
    weightG: 35,
    allocatedFreightMxn: 9,
    mexicoMarketRefMin: 280,
    mexicoMarketRefMax: 350,
    defaultSalePrice: 289,
  },
  {
    key: "car_refill",
    label: "Repuesto Fragancia Auto (Disco 6 ml)",
    keywords: ["car fragrance refill", "disco auto", "repuesto auto", "refill auto"],
    weightG: 20,
    allocatedFreightMxn: 4,
    mexicoMarketRefMin: 120,
    mexicoMarketRefMax: 160,
    defaultSalePrice: 120,
  },
  {
    key: "hand_cream",
    label: "Crema de Manos en Tubo (29 ml / 1 oz)",
    keywords: ["hand cream", "crema de manos", "dry hand relief"],
    weightG: 40,
    allocatedFreightMxn: 9,
    mexicoMarketRefMin: 180,
    mexicoMarketRefMax: 240,
    defaultSalePrice: 189,
  },
];

/**
 * Detecta la categoría de prorrateo más adecuada basándose en el título o descripción del producto
 */
export function detectFreightCategory(title: string = "", description: string = ""): FreightCategoryRule | null {
  const text = `${title} ${description}`.toLowerCase();

  // 1. Reglas específicas prioritarias (evitar falsos positivos como 3-wick vs 1-wick)
  if (text.includes("3 mechas") || text.includes("3-wick") || text.includes("tres mechas") || text.includes("14.5 oz")) {
    return LOTE3_FREIGHT_RULES.find(r => r.key === "three_wick") || null;
  }
  if (text.includes("1 mecha") || text.includes("single wick") || text.includes("single-wick") || text.includes("8 oz") && text.includes("candle") || text.includes("vela")) {
    return LOTE3_FREIGHT_RULES.find(r => r.key === "single_wick") || null;
  }
  if (text.includes("pocketbac holder") || text.includes("porta gel") || (text.includes("holder") && text.includes("gel"))) {
    return LOTE3_FREIGHT_RULES.find(r => r.key === "pocketbac_holder") || null;
  }
  if (text.includes("car fragrance holder") || (text.includes("auto") && text.includes("holder")) || text.includes("clip auto")) {
    return LOTE3_FREIGHT_RULES.find(r => r.key === "car_holder") || null;
  }
  if (text.includes("car fragrance refill") || (text.includes("repuesto") && text.includes("auto")) || text.includes("disco auto")) {
    return LOTE3_FREIGHT_RULES.find(r => r.key === "car_refill") || null;
  }
  if (text.includes("wallflower") || text.includes("bulbos") || text.includes("refills 2-pack")) {
    return LOTE3_FREIGHT_RULES.find(r => r.key === "wallflowers_duo") || null;
  }
  if (text.includes("pocketbac") || text.includes("gel antibacterial") || text.includes("hand sanitizer")) {
    return LOTE3_FREIGHT_RULES.find(r => r.key === "pocketbac") || null;
  }

  // 2. Coincidencia general de palabras clave
  for (const rule of LOTE3_FREIGHT_RULES) {
    if (rule.keywords.some(k => text.includes(k))) {
      return rule;
    }
  }

  return null;
}

export interface SmartPriceSuggestions {
  categoryRule: FreightCategoryRule | null;
  allocatedFreight: number;
  totalCostMxn: number;
  marketRange: { min: number; max: number };
  tiers: {
    quickSale: { price: number; profit: number; markupPct: number; label: string };
    optimal: { price: number; profit: number; markupPct: number; label: string };
    boutique: { price: number; profit: number; markupPct: number; label: string };
  };
}

/**
 * Calcula las 3 opciones inteligentes de precio basadas en costo, flete y mercado
 */
export function calculateSmartPrices(
  baseCostMxn: number,
  categoryRule: FreightCategoryRule | null,
  fallbackFreightMxn: number = 47.06
): SmartPriceSuggestions {
  const freight = categoryRule ? categoryRule.allocatedFreightMxn : fallbackFreightMxn;
  const totalCost = baseCostMxn + freight;

  // Mercado de referencia
  const marketMin = categoryRule ? categoryRule.mexicoMarketRefMin : Math.round(totalCost * 1.6);
  const marketMax = categoryRule ? categoryRule.mexicoMarketRefMax : Math.round(totalCost * 2.2);

  // Nivel 1: Rápida Salida / Oferta (30% sobre costo total, redondeado a precios atractivos estilo FoxDrop)
  const quickSalePrice = Math.max(
    Math.round(totalCost * 1.28),
    categoryRule ? Math.round(categoryRule.defaultSalePrice * 0.88) : Math.round(totalCost * 1.3)
  );

  // Nivel 2: Óptimo FoxDrop (Recomendado, gran margen pero por debajo de tienda departamental)
  const optimalPrice = categoryRule
    ? categoryRule.defaultSalePrice
    : Math.round(totalCost * 1.45);

  // Nivel 3: Boutique / Margen Máximo (Cercano al precio de lista departamental en México)
  const boutiquePrice = categoryRule
    ? Math.min(categoryRule.mexicoMarketRefMin, Math.round(categoryRule.defaultSalePrice * 1.18))
    : Math.round(totalCost * 1.70);

  return {
    categoryRule,
    allocatedFreight: freight,
    totalCostMxn: totalCost,
    marketRange: { min: marketMin, max: marketMax },
    tiers: {
      quickSale: {
        price: quickSalePrice,
        profit: quickSalePrice - totalCost,
        markupPct: totalCost > 0 ? Math.round(((quickSalePrice - totalCost) / totalCost) * 100) : 0,
        label: "⚡ Rápida Salida",
      },
      optimal: {
        price: optimalPrice,
        profit: optimalPrice - totalCost,
        markupPct: totalCost > 0 ? Math.round(((optimalPrice - totalCost) / totalCost) * 100) : 0,
        label: "🎯 Recomendado FoxDrop",
      },
      boutique: {
        price: boutiquePrice,
        profit: boutiquePrice - totalCost,
        markupPct: totalCost > 0 ? Math.round(((boutiquePrice - totalCost) / totalCost) * 100) : 0,
        label: "💎 Margen Boutique",
      },
    },
  };
}
