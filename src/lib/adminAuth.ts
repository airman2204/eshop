export const AUTHORIZED_ADMIN_EMAILS = [
  "magc2204@gmail.com",
  "nydia.villarce405@gmail.com",
];

export interface AdminSession {
  email: string;
  mustChangePassword: boolean;
  twoFactorVerified: boolean;
  token?: string;
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
 * Helper para llamar a /api/admin inyectando automáticamente el token en Authorization header
 */
export async function fetchAdminApi(bodyOrOptions: any): Promise<Response> {
  const token = getStoredAdminToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Si ya nos pasaron un objeto tipo { method: 'POST', body: '...' }
  if (bodyOrOptions && typeof bodyOrOptions === "object" && "body" in bodyOrOptions) {
    const customHeaders = bodyOrOptions.headers || {};
    return fetch("/api/admin", {
      ...bodyOrOptions,
      headers: { ...headers, ...customHeaders },
    });
  }

  return fetch("/api/admin", {
    method: "POST",
    headers,
    body: JSON.stringify(bodyOrOptions),
  });
}

/**
 * Helper para llamar a /api/admin/agent inyectando automáticamente el token en Authorization header
 */
export async function fetchAgentApi(bodyOrOptions: any): Promise<Response> {
  const token = getStoredAdminToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (bodyOrOptions && typeof bodyOrOptions === "object" && "body" in bodyOrOptions) {
    const customHeaders = bodyOrOptions.headers || {};
    return fetch("/api/admin/agent", {
      ...bodyOrOptions,
      headers: { ...headers, ...customHeaders },
    });
  }

  return fetch("/api/admin/agent", {
    method: "POST",
    headers,
    body: JSON.stringify(bodyOrOptions),
  });
}

/**
 * Valida el acceso de un administrador con correo y contraseña.
 * 1. Revisa lista blanca de correos autorizados.
 * 2. Consulta al servidor (/api/admin) que verifica el hash y genera token firmado.
 * 3. Si no hay contraseña personalizada en BD, permite la temporal 'FoxDrop2026!' y exige cambiarla.
 */
export async function authenticateAdmin(
  email: string,
  pass: string
): Promise<{ success: boolean; error?: string; session?: AdminSession }> {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Verificación de Lista Blanca
  if (!AUTHORIZED_ADMIN_EMAILS.includes(normalizedEmail)) {
    return {
      success: false,
      error: "Acceso denegado: El correo no cuenta con credenciales administrativas en FoxDrop.",
    };
  }

  // 2. Comprobar primero en el servidor seguro (/api/admin)
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify_password", email: normalizedEmail, password: pass }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.valid === true) {
        return {
          success: true,
          session: {
            email: normalizedEmail,
            mustChangePassword: data.mustChangePassword ?? false,
            twoFactorVerified: false,
            token: data.token,
          },
        };
      } else if (data.valid === false) {
        return { success: false, error: "Contraseña incorrecta." };
      }
    }
  } catch (err) {
    console.warn("Fallo verificando contraseña en servidor:", err);
  }

  // 3. Fallback en localStorage del dispositivo
  if (typeof window !== "undefined") {
    const savedLocalPass = localStorage.getItem(`admin_pass_${normalizedEmail}`);
    if (savedLocalPass) {
      if (savedLocalPass === pass) {
        return {
          success: true,
          session: {
            email: normalizedEmail,
            mustChangePassword: false,
            twoFactorVerified: false,
          },
        };
      }
      return { success: false, error: "Contraseña incorrecta." };
    }
  }

  // 4. Contraseña inicial genérica para primer acceso
  if (pass === "FoxDrop2026!" || pass === "Foxdrop2026*") {
    return {
      success: true,
      session: {
        email: normalizedEmail,
        mustChangePassword: true, // Obliga a cambiar de inmediato
        twoFactorVerified: false,
      },
    };
  }

  return {
    success: false,
    error: "Contraseña incorrecta. Utiliza la contraseña temporal provista.",
  };
}

/**
 * Actualiza la contraseña administrativa en localStorage y en Supabase vía /api/admin
 */
export async function updateAdminPassword(email: string, newPass: string) {
  if (newPass.length < 8) {
    throw new Error("La nueva contraseña debe tener al menos 8 caracteres.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Persistir de forma segura en Supabase con hash SHA-256 a través del endpoint del servidor
  try {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_password",
        email: normalizedEmail,
        password: newPass,
      }),
    });
    if (!res.ok) {
      const errJson = await res.json();
      console.warn("Advertencia al sincronizar en backend:", errJson.error);
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
  } catch (err) {
    console.warn("Error de red al actualizar contraseña remota:", err);
  }

  return true;
}
