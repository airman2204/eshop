import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────
// Cliente para uso en Client Components (browser)
// Singleton para evitar múltiples instancias por render
// ─────────────────────────────────────────────────────────
let browserClient: ReturnType<typeof createSupabaseClient> | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  browserClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return browserClient;
}

// Alias corto
export const supabase = getSupabaseBrowserClient;
