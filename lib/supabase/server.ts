import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./client";

let serverClient: SupabaseClient | null = null;

/**
 * Returns a Supabase client for Next.js Route Handlers and Server Components.
 *
 * Security: Uses SUPABASE_SERVICE_ROLE_KEY when available on the server
 * to bypass RLS before authentication is added in Phase 3, or falls back
 * to NEXT_PUBLIC_SUPABASE_ANON_KEY.
 *
 * Returns null if Supabase credentials are not configured.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (serverClient) return serverClient;

  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Prefer service role key if available, else anon key
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key =
    serviceRoleKey && !serviceRoleKey.includes("your-service-role")
      ? serviceRoleKey
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  serverClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serverClient;
}
