import { DatabaseNotConfiguredError } from "@/lib/supabase/require-client";

/**
 * Converts an internal error into a safe client-facing message.
 *
 * Database/provider messages can expose table names, SQL fragments, or endpoint
 * details. Only the explicit configuration error is safe to show; everything
 * else falls back to a stable message and is logged server-side.
 */
export function publicErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (error instanceof DatabaseNotConfiguredError) return error.message;
  return fallback;
}
