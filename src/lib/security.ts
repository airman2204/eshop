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

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
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

// ────────────────────────────────────────────────────────────────────────────
// BLINDAJE ADMINISTRATIVO: TOTP (RFC 6238), BRUTE-FORCE SHIELD & DISPOSITIVOS DE CONFIANZA
// ────────────────────────────────────────────────────────────────────────────

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let val = 0;
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    val = (val << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((val >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let val = 0;
  let output = "";
  for (let i = 0; i < buffer.length; i++) {
    val = (val << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(val >> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(val << (5 - bits)) & 31];
  }
  return output;
}

/**
 * Genera un secreto Base32 seguro para Google / Microsoft Authenticator y la URL otpauth://
 */
export function generateTotpSecret(email: string): { secret: string; otpauthUrl: string } {
  const randomBytes = crypto.randomBytes(20);
  const secret = base32Encode(randomBytes);
  const issuer = encodeURIComponent("FoxDrop");
  const account = encodeURIComponent(email.trim().toLowerCase());
  const otpauthUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  return { secret, otpauthUrl };
}

/**
 * Verifica un código de 6 dígitos con ventana de tolerancia de ±1 paso (±30 segundos)
 */
export function verifyTotpCode(secret: string, code: string, windowSteps = 1): boolean {
  if (!secret || !code) return false;
  const cleanCode = code.trim().replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleanCode)) return false;

  try {
    const key = base32Decode(secret);
    const epoch = Math.floor(Date.now() / 1000);
    const currentStep = Math.floor(epoch / 30);

    for (let stepOffset = -windowSteps; stepOffset <= windowSteps; stepOffset++) {
      const step = currentStep + stepOffset;
      const buf = Buffer.alloc(8);
      buf.writeBigInt64BE(BigInt(step));

      const hmac = crypto.createHmac("sha1", key).update(buf).digest();
      const offset = hmac[hmac.length - 1] & 0x0f;
      const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

      const generated = (binary % 1000000).toString().padStart(6, "0");
      if (generated === cleanCode) {
        return true;
      }
    }
  } catch (err) {
    console.warn("Aviso validando TOTP:", err);
  }
  return false;
}

/**
 * Genera códigos de respaldo de emergencia únicos (formato XXXX-XXXX)
 */
export function generateBackupCodes(count = 6): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const part1 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}

// ── BRUTE FORCE SHIELD (5 intentos fallidos -> Bloqueo de 30 min) ──────────
interface LoginAttemptRecord {
  attempts: number;
  blockedUntil: number | null;
}

const loginAttemptsMap = new Map<string, LoginAttemptRecord>();

export function checkBruteForceLock(email: string, ip: string): { locked: boolean; remainingMinutes?: number } {
  const now = Date.now();
  const key = `${email.trim().toLowerCase()}_${ip}`;
  const record = loginAttemptsMap.get(key);

  if (!record || !record.blockedUntil) {
    return { locked: false };
  }

  if (now < record.blockedUntil) {
    const remainingMs = record.blockedUntil - now;
    const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
    return { locked: true, remainingMinutes };
  }

  // Desbloqueo tras expiración
  loginAttemptsMap.delete(key);
  return { locked: false };
}

export function recordLoginFailure(email: string, ip: string): { attemptsLeft: number; locked: boolean; remainingMinutes?: number } {
  const now = Date.now();
  const key = `${email.trim().toLowerCase()}_${ip}`;
  const record = loginAttemptsMap.get(key) || { attempts: 0, blockedUntil: null };

  record.attempts += 1;

  if (record.attempts >= 5) {
    // Bloquear por 30 minutos
    record.blockedUntil = now + 30 * 60 * 1000;
    loginAttemptsMap.set(key, record);
    return { attemptsLeft: 0, locked: true, remainingMinutes: 30 };
  }

  loginAttemptsMap.set(key, record);
  return { attemptsLeft: Math.max(0, 5 - record.attempts), locked: false };
}

export function clearLoginFailures(email: string, ip: string): void {
  const key = `${email.trim().toLowerCase()}_${ip}`;
  loginAttemptsMap.delete(key);
}

// ── DISPOSITIVOS DE CONFIANZA (Recordar por 30 días) ────────────────────────
export function createTrustedDeviceToken(email: string): { token: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + (30 * 86400); // 30 días
  const randomPart = crypto.randomBytes(32).toString("hex");
  const payload = {
    email: email.trim().toLowerCase(),
    nonce: randomPart,
    exp: expiresAt,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", ADMIN_SECRET).update(payloadB64).digest("base64url");
  return { token: `${payloadB64}.${signature}`, expiresAt };
}

export function verifyTrustedDeviceToken(email: string, token: string | null | undefined): boolean {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return false;

  const expectedSignature = crypto.createHmac("sha256", ADMIN_SECRET).update(payloadB64).digest("base64url");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return false;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    if (payload.email !== email.trim().toLowerCase()) return false;
    if (Date.now() / 1000 > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

