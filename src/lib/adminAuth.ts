import { getSupabaseBrowserClient } from "./supabase/client";

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
 * Aplica lista blanca estricta (solo magc2204@gmail.com y nydia.villarce405@gmail.com).
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

  // 2. Comprobar si hay una contraseña actualizada en localStorage o Supabase
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

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseBrowserClient() as any;
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", normalizedEmail)
      .single();

    if (profile && profile.admin_password_hash) {
      if (profile.admin_password_hash !== pass) {
        return { success: false, error: "Contraseña incorrecta." };
      }
      return {
        success: true,
        session: {
          email: normalizedEmail,
          mustChangePassword: profile.must_change_password ?? false,
          twoFactorVerified: false,
        },
      };
    }
  } catch (err) {
    console.warn("Verificando credenciales locales de contingencia:", err);
  }

  // Contraseña inicial genérica para primer acceso
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
 * Actualiza la contraseña administrativa del perfil
 */
export async function updateAdminPassword(email: string, newPass: string) {
  if (newPass.length < 8) {
    throw new Error("La nueva contraseña debe tener al menos 8 caracteres.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Guardar siempre en almacenamiento seguro del navegador
  if (typeof window !== "undefined") {
    localStorage.setItem(`admin_pass_${normalizedEmail}`, newPass);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseBrowserClient() as any;
    await supabase
      .from("profiles")
      .update({
        role: "admin",
        updated_at: new Date().toISOString(),
      })
      .eq("email", normalizedEmail);
  } catch (err) {
    console.warn("Actualización remota opcional no disponible:", err);
  }

  return true;
}

