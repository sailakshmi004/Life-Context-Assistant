import { NextResponse } from "next/server";
import {
  getSupabaseServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public liveness probe used by Docker/the reverse proxy. Intentionally exposes
 * only a coarse database status, never connection details or row contents.
 */
export async function GET() {
  const configured = isSupabaseServerConfigured();
  let databaseStatus = configured ? "unknown" : "not_configured";

  if (configured) {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase
        .from("activities")
        .select("id", { count: "exact", head: true });
      databaseStatus = error ? "unreachable" : "connected";
    }
  }

  const healthy = !configured || databaseStatus === "connected";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      app: "Awarely (Life Context Assistant)",
      database: databaseStatus,
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
