/**
 * ============================================================================
 * FOXDROP — UTILIDADES DE SEGURIDAD, RATE LIMITING & AUTORIZACIÓN JWT/HMAC
 * ============================================================================
 */

import crypto from "crypto";

// Clave secreta para firmar tokens de sesión administrativa
const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "foxdrop-super-secure-admin-secret-2026";

export interface AdminTokenPayload {
  email: string;
  exp: number; // Unix timestamp en segundos
  role: "admin";
}

/**
 * Genera un token HMAC-SHA256 firmado con expiración para el admin autenticado.
 */
export function generateAdminToken(email: string, durationSeconds = 86400 * 7): string {
  const payload: AdminTokenPayload = {
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + durationSeconds,
    role: "admin",
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", ADMIN_SECRET)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Verifica la autenticidad y vigencia de un token de admin.
 */
export function verifyAdminToken(token: string | null | undefined): { valid: boolean; email?: string } {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { valid: false };
  }

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) {
    return { valid: false };
  }

  const expectedSignature = crypto
    .createHmac("sha256", ADMIN_SECRET)
    .update(payloadB64)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return { valid: false };
  }

  try {
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload: AdminTokenPayload = JSON.parse(payloadJson);

    // Verificar expiración
    if (Date.now() / 1000 > payload.exp) {
      return { valid: false };
    }

    return { valid: true, email: payload.email };
  } catch {
    return { valid: false };
  }
}

/**
 * Memoria en proceso para Rate Limiting (control de peticiones abusivas)
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Aplica límite de peticiones por IP y clave de acción.
 * Retorna true si la petición es admitida, false si excedió el límite.
 */
export function checkRateLimit(key: string, maxRequests: number, windowSeconds: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowSeconds * 1000,
    });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count += 1;
  return true;
}

/**
 * Limpieza periódica para evitar fugas de memoria en rateLimitMap
 */
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap.entries()) {
    if (now > v.resetTime) {
      rateLimitMap.delete(k);
    }
  }
}, 60000);
