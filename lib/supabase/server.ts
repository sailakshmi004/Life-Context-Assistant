import { createClient, SupabaseClient } from "@supabase/supabase-js";

let serverClient: SupabaseClient | null = null;

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return (
    value.includes("your-project-id") ||
    value.includes("your-project.supabase.co") ||
    value.includes("your-service-role") ||
    value.includes("replace-with")
  );
}

/**
 * Returns true when the server has everything needed to talk to Supabase.
 *
 * These are deliberately NOT `NEXT_PUBLIC_*` variables: Next.js inlines
 * `NEXT_PUBLIC_*` values at build time, which would freeze secrets/config from
 * the Docker build instead of reading the runtime environment.
 */
export function isSupabaseServerConfigured(): boolean {
  return (
    !isPlaceholder(process.env.SUPABASE_URL) &&
    !isPlaceholder(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

/**
 * Returns a service-role Supabase client for Route Handlers and Server
 * Components. RLS policies deny anonymous access, so this key is required for
 * application reads/writes. Never import this from a Client Component.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseServerConfigured()) return null;
  if (serverClient) return serverClient;

  serverClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  return serverClient;
}
