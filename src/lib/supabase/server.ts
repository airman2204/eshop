import { createClient } from "@supabase/supabase-js";

// Cliente servidor con service_role (solo en Server Components / API Routes)
// NUNCA exponer en el cliente
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
