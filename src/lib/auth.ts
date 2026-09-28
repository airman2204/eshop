import { getSupabaseBrowserClient } from "./supabase/client";

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  role: 'client' | 'admin' | 'repartidor';
  loyaltyPoints: number;
}

/**
 * Solicita el envío de un código OTP o enlace de acceso al correo electrónico
 */
export async function sendEmailOTP(email: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error("Error enviando OTP por correo:", error);
    throw error;
  }

  return data;
}

/**
 * Verifica el código OTP de 6 dígitos ingresado por el usuario
 */
export async function verifyEmailOTP(email: string, token: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) {
    console.error("Error verificando OTP:", error);
    throw error;
  }

  return data;
}

/**
 * Obtiene el usuario autenticado actualmente y su perfil de la base de datos
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseBrowserClient() as any;
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profile) {
      return {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        phone: profile.phone,
        role: profile.role || "client",
        loyaltyPoints: profile.loyalty_points || 0,
      };
    }

    // Fallback con datos de sesión
    return {
      id: session.user.id,
      email: session.user.email || "",
      fullName: session.user.user_metadata?.full_name || "",
      phone: session.user.phone || "",
      role: "client",
      loyaltyPoints: 0,
    };
  } catch (err) {
    console.error("Error obteniendo perfil actual:", err);
    return null;
  }
}

/**
 * Guarda o actualiza los datos del perfil de usuario en Supabase
 */
export async function upsertUserProfile(profile: { id: string; email: string; full_name?: string; phone?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;
  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      phone: profile.phone,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Error al actualizar perfil:", error);
  }
}

/**
 * Cierra la sesión activa
 */
export async function signOut() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;
  await supabase.auth.signOut();
}
