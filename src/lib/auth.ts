import { getSupabaseBrowserClient } from "./supabase/client";
import { UserAddress, UserCard } from "@/types";

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
  const cleanEmail = email.trim().toLowerCase();
  const cleanToken = token.trim();

  // Intentamos primero con type: 'email' (estándar OTP de Supabase)
  let result = await supabase.auth.verifyOtp({
    email: cleanEmail,
    token: cleanToken,
    type: "email",
  });

  // Si falló por tipo, intentamos con type: 'magiclink' (usado en ciertas versiones/plantillas)
  if (result.error) {
    const retryResult = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: "magiclink",
    });

    if (!retryResult.error && retryResult.data) {
      return retryResult.data;
    }

    console.error("Error verificando OTP:", result.error);
    throw result.error;
  }

  return result.data;
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


export interface FullUserProfile extends UserProfile {
  addresses: UserAddress[];
  cards: UserCard[];
  createdAt?: string;
}

/**
 * Consulta de manera inteligente si un usuario ya está registrado en FoxDrop
 * Para no volver a pedirle nombre y teléfono en cada login.
 */
export async function lookupUserByEmail(email: string): Promise<{ exists: boolean; fullName?: string; phone?: string }> {
  try {
    const res = await fetch("/api/auth/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        exists: Boolean(data.exists),
        fullName: data.fullName || undefined,
        phone: data.phone || undefined,
      };
    }
  } catch (err) {
    console.warn("Fallo al verificar existencia de usuario:", err);
  }

  // Fallback directo a supabase client
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseBrowserClient() as any;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (profile) {
      return {
        exists: true,
        fullName: profile.full_name,
        phone: profile.phone,
      };
    }
  } catch (e) {
    console.warn("Fallback lookup error:", e);
  }

  return { exists: false };
}

/**
 * Obtiene el perfil completo del usuario actual (datos, puntos, direcciones y tarjetas)
 */
export async function getUserFullProfile(): Promise<FullUserProfile | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSupabaseBrowserClient() as any;
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) return null;

    // Intentar consultar API de perfil
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_profile",
          userId: session.user.id,
          email: session.user.email,
        }),
      });

      if (res.ok) {
        const fullData = await res.json();
        return {
          id: fullData.id || session.user.id,
          email: fullData.email || session.user.email || "",
          fullName: fullData.fullName || session.user.user_metadata?.full_name || "",
          phone: fullData.phone || session.user.user_metadata?.phone || "",
          role: fullData.role || "client",
          loyaltyPoints: fullData.loyaltyPoints ?? 0,
          addresses: fullData.addresses || [],
          cards: fullData.cards || [],
          createdAt: fullData.createdAt || session.user.created_at,
        };
      }
    } catch (apiErr) {
      console.warn("Fallo llamando /api/user/profile, usando fallback de sesión:", apiErr);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();

    const meta = session.user.user_metadata || {};
    return {
      id: session.user.id,
      email: session.user.email || "",
      fullName: profile?.full_name || meta.full_name || "",
      phone: profile?.phone || meta.phone || "",
      role: profile?.role || "client",
      loyaltyPoints: profile?.loyalty_points || 0,
      addresses: meta.addresses || [],
      cards: meta.cards || [],
      createdAt: session.user.created_at,
    };
  } catch (err) {
    console.error("Error obteniendo perfil completo:", err);
    return null;
  }
}

/**
 * Guarda o actualiza los datos del perfil de usuario en Supabase
 */
export async function upsertUserProfile(profile: { id: string; email: string; full_name?: string; phone?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;

  // Actualizar metadata de auth en navegador
  try {
    await supabase.auth.updateUser({
      data: {
        full_name: profile.full_name,
        phone: profile.phone,
      },
    });
  } catch (metaErr) {
    console.warn("Aviso actualizando auth metadata:", metaErr);
  }

  // Actualizar tabla profiles
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

  // Notificar también a la API de servidor
  fetch("/api/user/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "update_profile",
      userId: profile.id,
      email: profile.email,
      profileData: {
        fullName: profile.full_name,
        phone: profile.phone,
      },
    }),
  }).catch(() => {});
}

/**
 * Guarda o actualiza una dirección en el perfil del usuario
 */
export async function saveUserAddress(address: UserAddress): Promise<UserAddress[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Sesión no activa");

  const res = await fetch("/api/user/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "save_address",
      userId: session.user.id,
      email: session.user.email,
      address,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al guardar dirección");
  }

  const json = await res.json();
  return json.addresses || [];
}

/**
 * Elimina una dirección del perfil
 */
export async function deleteUserAddress(addressId: string): Promise<UserAddress[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Sesión no activa");

  const res = await fetch("/api/user/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "delete_address",
      userId: session.user.id,
      email: session.user.email,
      addressId,
    }),
  });

  if (!res.ok) throw new Error("Error al eliminar dirección");
  const json = await res.json();
  return json.addresses || [];
}

/**
 * Guarda o actualiza una tarjeta bancaria en el perfil
 */
export async function saveUserCard(card: UserCard): Promise<UserCard[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Sesión no activa");

  const res = await fetch("/api/user/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "save_card",
      userId: session.user.id,
      email: session.user.email,
      card,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al guardar tarjeta");
  }

  const json = await res.json();
  return json.cards || [];
}

/**
 * Elimina una tarjeta del perfil
 */
export async function deleteUserCard(cardId: string): Promise<UserCard[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Sesión no activa");

  const res = await fetch("/api/user/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "delete_card",
      userId: session.user.id,
      email: session.user.email,
      cardId,
    }),
  });

  if (!res.ok) throw new Error("Error al eliminar tarjeta");
  const json = await res.json();
  return json.cards || [];
}

/**
 * Actualiza nombre y teléfono del perfil
 */
export async function updateUserProfileData(profileData: { fullName: string; phone: string }): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Sesión no activa");

  await upsertUserProfile({
    id: session.user.id,
    email: session.user.email || "",
    full_name: profileData.fullName,
    phone: profileData.phone,
  });
}

/**
 * Cierra la sesión activa
 */
export async function signOut() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseBrowserClient() as any;
  await supabase.auth.signOut();
}

