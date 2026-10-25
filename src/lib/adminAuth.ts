export const AUTHORIZED_ADMIN_EMAILS = [
  "magc2204@gmail.com",
  "nydia.villarce405@gmail.com",
];

export interface AdminSession {
  email: string;
  mustChangePassword: boolean;
  twoFactorVerified: boolean;
  twoFactorEnabled?: boolean;
  token?: string;
}

/**
 * Obtiene el token de dispositivo de confianza (30 días) desde localStorage
 */
export function getStoredTrustedDeviceToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("foxdrop_admin_trusted_device") || null;
  } catch {}
  return null;
}

/**
 * Guarda el token de dispositivo de confianza en localStorage
 */
export function setStoredTrustedDeviceToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("foxdrop_admin_trusted_device", token);
  } catch {}
}

/**
 * Obtiene el token activo de administración desde localStorage
 */
export function getStoredAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("foxdrop_admin_session");
    if (raw) {
      const parsed: AdminSession = JSON.parse(raw);
      return parsed.token || null;
    }
  } catch {}
  return null;
}

/**
 * Obtiene el email activo de administración desde localStorage
 */
export function getStoredAdminEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("foxdrop_admin_session");
    if (raw) {
      const parsed: AdminSession = JSON.parse(raw);
      return parsed.email || null;
    }
  } catch {}
  return null;
}

/**
 * Helper para llamar a /api/admin inyectando automáticamente el token en Authorization header
 */
export async function fetchAdminApi(bodyOrOptions: any): Promise<Response> {
  const token = getStoredAdminToken();
  const email = getStoredAdminEmail();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (email) {
    headers["x-admin-email"] = email;
  }

  // Si ya nos pasaron un objeto tipo { method: 'POST', body: '...' }
  if (bodyOrOptions && typeof bodyOrOptions === "object" && "body" in bodyOrOptions) {
    const customHeaders = bodyOrOptions.headers || {};
    return fetch("/api/admin", {
      ...bodyOrOptions,
      headers: { ...headers, ...customHeaders },
    });
  }

  const payload =
    bodyOrOptions && typeof bodyOrOptions === "object"
      ? { ...bodyOrOptions, adminToken: token, adminEmail: email }
      : bodyOrOptions;

  return fetch("/api/admin", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

/**
 * Helper para llamar a /api/admin/agent inyectando automáticamente el token en Authorization header
 */
export async function fetchAgentApi(bodyOrOptions: any): Promise<Response> {
  const token = getStoredAdminToken();
  const email = getStoredAdminEmail();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (email) {
    headers["x-admin-email"] = email;
  }

  if (bodyOrOptions && typeof bodyOrOptions === "object" && "body" in bodyOrOptions) {
    const customHeaders = bodyOrOptions.headers || {};
    return fetch("/api/admin/agent", {
      ...bodyOrOptions,
      headers: { ...headers, ...customHeaders },
    });
  }

  const payload =
    bodyOrOptions && typeof bodyOrOptions === "object"
      ? { ...bodyOrOptions, adminToken: token, adminEmail: email }
      : bodyOrOptions;

  return fetch("/api/admin/agent", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

/**
 * Helper para llamar a /api/admin/cj inyectando automáticamente el token en Authorization header
 */
export async function fetchAdminCjApi(bodyOrOptions: any): Promise<Response> {
  const token = getStoredAdminToken();
  const email = getStoredAdminEmail();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (bodyOrOptions && typeof bodyOrOptions === "object" && "body" in bodyOrOptions) {
    const customHeaders = bodyOrOptions.headers || {};
    return fetch("/api/admin/cj", {
      ...bodyOrOptions,
      headers: { ...headers, ...customHeaders },
    });
  }

  const payload = typeof bodyOrOptions === "object" ? { ...bodyOrOptions, adminToken: token, adminEmail: email } : bodyOrOptions;

  return fetch("/api/admin/cj", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

/**
 * Valida el acceso de un administrador con correo y contraseña.
 * 1. Revisa lista blanca de correos autorizados.
 * 2. Consulta al servidor (/api/admin) que verifica el hash y genera token firmado.
 */
export async function authenticateAdmin(
  email: string,
  pass: string
): Promise<{ 
  success: boolean; 
  error?: string; 
  session?: AdminSession; 
  requires2FA?: boolean; 
  tempToken?: string;
}> {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Verificación de Lista Blanca
  if (!AUTHORIZED_ADMIN_EMAILS.includes(normalizedEmail)) {
    return {
      success: false,
      error: "Acceso denegado: El correo no cuenta con credenciales administrativas en FoxDrop.",
    };
  }

  // 2. Comprobar en el servidor seguro (/api/admin) enviando token de dispositivo si existe
  try {
    const trustedToken = getStoredTrustedDeviceToken();
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        action: "verify_password", 
        email: normalizedEmail, 
        password: pass,
        trustedDeviceToken: trustedToken || undefined
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.status === 429) {
      return { success: false, error: data.error || "Acceso bloqueado por intentos excesivos." };
    }

    if (res.ok) {
      // Caso 1: Requiere segundo factor (TOTP / Google Authenticator)
      if (data.requires2FA) {
        return {
          success: true,
          requires2FA: true,
          tempToken: data.tempToken,
        };
      }

      // Caso 2: Login completado (o dispositivo de confianza verificado)
      if (data.valid === true) {
        return {
          success: true,
          session: {
            email: normalizedEmail,
            mustChangePassword: data.mustChangePassword ?? false,
            twoFactorVerified: Boolean(data.twoFactorEnabled),
            twoFactorEnabled: Boolean(data.twoFactorEnabled),
            token: data.token,
          },
        };
      } else if (data.valid === false) {
        return { success: false, error: data.error || "Contraseña incorrecta." };
      }
    } else {
      return { success: false, error: data.error || "Error al verificar credenciales." };
    }
  } catch (err: any) {
    console.warn("Fallo verificando contraseña en servidor:", err);
    return { success: false, error: err.message || "Fallo de conexión con el servidor de autenticación." };
  }

  return {
    success: false,
    error: "Contraseña incorrecta o credenciales no configuradas.",
  };
}

/**
 * Valida el código 2FA (TOTP de 6 dígitos o Backup Code) en el servidor
 */
export async function verify2FaLogin(
  email: string,
  tempToken: string,
  code: string,
  trustThisDevice: boolean
): Promise<{ success: boolean; error?: string; session?: AdminSession }> {
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify_2fa_login",
        email: email.trim().toLowerCase(),
        tempToken,
        code: code.trim(),
        trustThisDevice,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Código de autenticación incorrecto." };
    }

    // Si el usuario marcó confiar en este equipo, guardar el token por 30 días
    if (data.trustedDeviceToken) {
      setStoredTrustedDeviceToken(data.trustedDeviceToken);
    }

    const session: AdminSession = {
      email: email.trim().toLowerCase(),
      mustChangePassword: false,
      twoFactorVerified: true,
      twoFactorEnabled: true,
      token: data.token,
    };

    return { success: true, session };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al validar código 2FA." };
  }
}

/**
 * Inicia la configuración de 2FA generando el QR y los códigos de respaldo
 */
export async function setup2FaInit(email: string): Promise<{
  success: boolean;
  secret?: string;
  otpauthUrl?: string;
  qrCodeUrl?: string;
  backupCodes?: string[];
  error?: string;
}> {
  try {
    const res = await fetchAdminApi({
      action: "setup_2fa_init",
      adminEmail: email,
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || "Error al generar configuración 2FA" };
  }
}

/**
 * Confirma el 2FA con el primer código escaneado de la app
 */
export async function setup2FaConfirm(
  email: string,
  secret: string,
  code: string,
  backupCodes: string[]
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetchAdminApi({
      action: "setup_2fa_confirm",
      adminEmail: email,
      secret,
      code,
      backupCodes,
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || "Error al confirmar 2FA" };
  }
}

/**
 * Consulta si el usuario tiene el 2FA activo y cuántos códigos de respaldo le quedan
 */
export async function get2FaStatus(email: string): Promise<{
  success: boolean;
  enabled: boolean;
  backupCodesCount: number;
}> {
  try {
    const res = await fetchAdminApi({
      action: "get_2fa_status",
      adminEmail: email,
    });
    return await res.json();
  } catch {
    return { success: true, enabled: false, backupCodesCount: 0 };
  }
}

/**
 * Desactiva el 2FA
 */
export async function disable2Fa(
  email: string,
  pass: string,
  code?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetchAdminApi({
      action: "disable_2fa",
      adminEmail: email,
      password: pass,
      code,
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || "Error al desactivar 2FA" };
  }
}

/**
 * Actualiza la contraseña administrativa en Supabase vía /api/admin de forma segura
 */
export async function updateAdminPassword(email: string, newPass: string, currentPass?: string) {
  if (newPass.length < 8) {
    throw new Error("La nueva contraseña debe tener al menos 8 caracteres.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const token = getStoredAdminToken();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Persistir de forma segura en Supabase con hash SHA-256 a través del endpoint del servidor
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "update_password",
        email: normalizedEmail,
        password: newPass,
        currentPassword: currentPass,
      }),
    });
    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error || "Fallo al actualizar contraseña en el servidor");
    } else {
      const data = await res.json();
      if (data.token && typeof window !== "undefined") {
        const stored = localStorage.getItem("foxdrop_admin_session");
        const currentSession: AdminSession = stored ? JSON.parse(stored) : { email: normalizedEmail, mustChangePassword: false, twoFactorVerified: false };
        currentSession.token = data.token;
        currentSession.mustChangePassword = false;
        localStorage.setItem("foxdrop_admin_session", JSON.stringify(currentSession));
      }
    }
  } catch (err: any) {
    console.warn("Error al actualizar contraseña:", err);
    throw err;
  }

  return true;
}

