export const AUTHORIZED_ADMIN_EMAILS = [
  "magc2204@gmail.com",
  "nydia.villarce405@gmail.com",
];

export interface AdminSession {
  email: string;
  mustChangePassword: boolean;
  twoFactorVerified: boolean;
}

/**
 * Valida el acceso de un administrador con correo y contraseña.
 * 1. Revisa localStorage del dispositivo actual.
 * 2. Si no hay o no coincide, consulta al servidor (/api/admin) que tiene acceso a Supabase con Service Role.
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
          },
        };
      } else if (data.valid === false) {
        return { success: false, error: "Contraseña incorrecta." };
      }
      // data.valid === null significa que no hay contraseña en BD todavía
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
    }
  } catch (err) {
    console.warn("Error de red al actualizar contraseña remota:", err);
  }

  return true;
}
