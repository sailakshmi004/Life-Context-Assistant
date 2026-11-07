import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "Awarely (Life Context Assistant)",
    phase: 1,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
}
