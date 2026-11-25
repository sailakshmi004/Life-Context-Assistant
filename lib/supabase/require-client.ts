import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "./server";

/**
 * Thrown when a database operation is attempted without Supabase configured.
 * In production we fail loudly instead of silently writing to a process-local
 * in-memory store (which would appear to work but lose data on restart).
 */
export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
    this.name = "DatabaseNotConfiguredError";
  }
}

export function requireSupabase(): SupabaseClient {
  const supabase = getSupabaseServerClient();
  if (!supabase) throw new DatabaseNotConfiguredError();
  return supabase;
}
