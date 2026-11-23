import { createClient } from "@supabase/supabase-js";

let agencyBrowserClient: ReturnType<typeof createClient> | null = null;

export function getAgencyBrowserClient() {
  if (agencyBrowserClient) return agencyBrowserClient;
  const url =
    process.env.NEXT_PUBLIC_AGENCY_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.NEXT_PUBLIC_AGENCY_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  agencyBrowserClient = createClient(url, key);
  return agencyBrowserClient;
}

export function createAgencyServerClient() {
  const url =
    process.env.NEXT_PUBLIC_AGENCY_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.AGENCY_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_AGENCY_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}
