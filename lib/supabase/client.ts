import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Checks whether Supabase environment variables have been configured
 * with non-default, real values.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return false;
  if (url.includes("your-project-id") || url.includes("your-project.supabase.co")) return false;
  if (anonKey === "your-anon-public-key" || anonKey === "your-anon-key-here") return false;

  return true;
}

let browserClient: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase browser client.
 * Safe for use in Client Components.
 * If credentials are not configured, returns null without throwing.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    // In server environment, use getSupabaseServerClient instead
    return null;
  }

  if (browserClient) return browserClient;

  if (!isSupabaseConfigured()) {
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return browserClient;
}
