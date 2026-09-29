/**
 * CONSTANTES GLOBALES DE FOXDROP
 * Valores de negocio centralizados aquí para fácil mantenimiento
 */

export const APP_NAME = "FoxDrop";
export const APP_TAGLINE = "Tu Atajo al Mundo";
export const APP_PHONE = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || ""; // Número oficial de WhatsApp del negocio
export const APP_EMAIL = "hola@foxdrop.mx";
export const APP_CITY = "Puebla, México";

// Colores de marca
export const BRAND = {
  orange: "#E65F2B",
  teal: "#2D4A58",
  cream: "#FDFBF7",
} as const;

// Costos de envío (MXN)
export const SHIPPING_COSTS = {
  puebla_local: 50,
  agreed_pickup: 0,
  national_shipping: 140,
} as const;

export const PICKUP_POINTS = [
  { id: "plaza-dorada", name: "Plaza Dorada", address: "Blvd. Atlixco 4906, Col. Concepción La Cruz" },
  { id: "angelopolis", name: "Angelópolis", address: "Blvd. del Niño Poblano 2510, Reserva Territorial" },
  { id: "zocalo", name: "Zona Zócalo", address: "5 de Mayo 214, Centro Histórico" },
  { id: "capu", name: "Central CAPU", address: "Blvd. Norte 4, Col. El Vergel" },
] as const;

// Categorías del catálogo
export const CATEGORIES = [
  { id: "electronica", name: "Electrónica", slug: "electronica", icon: "💻" },
  { id: "moda", name: "Moda", slug: "moda", icon: "👗" },
  { id: "hogar", name: "Hogar", slug: "hogar", icon: "🏠" },
  { id: "cosmetica", name: "Cosmética", slug: "cosmetica", icon: "💄" },
  { id: "deportes", name: "Deportes", slug: "deportes", icon: "🏋️" },
  { id: "coleccionables", name: "Coleccionables", slug: "coleccionables", icon: "🎁" },
] as const;

// Tipo de cambio fallback (se sobreescribe con API en tiempo real)
export const FALLBACK_USD_MXN = 20.0;

// Descuento por carrito abandonado
export const ABANDONED_CART_DISCOUNT_CODE = "DESC5";
export const ABANDONED_CART_DISCOUNT_PERCENT = 5;

// Tiempo (en minutos) después del cual un carrito se considera abandonado
export const ABANDONED_CART_TIMEOUT_MINUTES = 30;

// Paginación
export const PRODUCTS_PER_PAGE = 12;
