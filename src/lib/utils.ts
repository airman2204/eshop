import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases Tailwind de forma segura */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea un número como precio en MXN */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Formatea un número como precio en USD */
export function formatPriceUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Calcula el porcentaje de margen */
export function calcMargin(cost: number, price: number): number {
  if (price === 0) return 0;
  return ((price - cost) / price) * 100;
}

/** Genera un ID de orden legible tipo FX-XXXXXX */
export function generateOrderId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "FX-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/** Trunca texto a un máximo de caracteres */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}

/** Formatea una fecha en español (Puebla, MX) */
export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  }).format(new Date(dateString));
}

/** Convierte un objeto de dirección a string para WhatsApp */
export function addressToString(address: {
  street?: string;
  colonia?: string;
  city?: string;
  state?: string;
  zip?: string;
}): string {
  const parts = [
    address.street,
    address.colonia,
    address.city,
    address.state,
    address.zip,
  ].filter(Boolean);
  return parts.join(", ");
}

/** Construye un enlace de WhatsApp con mensaje pre-llenado */
export function buildWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const fullPhone = cleanPhone.startsWith("52") ? cleanPhone : `52${cleanPhone}`;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}

/** Determina el color del badge según el estado de un pedido */
export function getStatusColor(
  status: string
): { bg: string; text: string; label: string } {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pendiente" },
    processing: { bg: "bg-blue-100", text: "text-blue-800", label: "En Preparación" },
    shipped: { bg: "bg-purple-100", text: "text-purple-800", label: "En Camino" },
    delivered: { bg: "bg-green-100", text: "text-green-800", label: "Entregado" },
    cancelled: { bg: "bg-red-100", text: "text-red-800", label: "Cancelado" },
  };
  return map[status] ?? { bg: "bg-gray-100", text: "text-gray-800", label: status };
}
