import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isSupabaseConfigured();
  let dbStatus = "not_configured";
  let latencyMs = 0;
  let rowCount = 0;

  if (configured) {
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const start = Date.now();
      try {
        const { count, error } = await supabase
          .from("activities")
          .select("*", { count: "exact", head: true });

        latencyMs = Date.now() - start;
        if (error) {
          dbStatus = `error: ${error.message}`;
        } else {
          dbStatus = "connected";
          rowCount = count ?? 0;
        }
      } catch (err: unknown) {
        dbStatus = `unreachable: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  }

  return NextResponse.json({
    status: dbStatus === "connected" ? "ok" : "degraded",
    app: "Awarely (Life Context Assistant)",
    database: {
      provider: "Supabase PostgreSQL",
      configured,
      status: dbStatus,
      latencyMs: dbStatus === "connected" ? latencyMs : undefined,
      recordCount: rowCount,
    },
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
}
