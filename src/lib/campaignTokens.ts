import crypto from "crypto";

const CAMPAIGN_ENCRYPTION_SECRET = process.env.CAMPAIGN_SECRET || "FOXDROP_CAMPAIGN_SECRET_KEY_2026";

/**
 * Encripta un código de cupón (ej: HAL-FOX-001) a un token seguro para URL
 */
export function encryptPromoToken(code: string): string {
  try {
    const key = crypto.createHash("sha256").update(CAMPAIGN_ENCRYPTION_SECRET).digest();
    const iv = Buffer.alloc(16, 0); // IV constante para que sea determinista y reproducible
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(code.trim().toUpperCase(), "utf8", "base64url");
    encrypted += cipher.final("base64url");
    return encrypted;
  } catch (err) {
    console.error("Error encrypting promo token:", err);
    return code;
  }
}

/**
 * Desencripta un token de URL para recuperar el código original del cupón
 * Si el token no es un texto cifrado válido o fue manipulado, retorna null
 */
export function decryptPromoToken(token: string): string | null {
  try {
    const key = crypto.createHash("sha256").update(CAMPAIGN_ENCRYPTION_SECRET).digest();
    const iv = Buffer.alloc(16, 0);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(token.trim(), "base64url", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted.trim().toUpperCase();
  } catch {
    // Si no es un token cifrado válido o fue alterado, devolvemos null
    return null;
  }
}
