/**
 * Supabase Server Client Placeholder (Phase 1)
 *
 * Designed for Next.js Route Handlers and Server Components.
 * In future phases, this will use `@supabase/ssr` with Next.js cookies.
 */

export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  // Future phase: Return authenticated Supabase admin/server client
  return null;
}
