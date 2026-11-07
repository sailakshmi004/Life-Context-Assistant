import React from "react";
import { Settings, Shield, CloudSun, Database } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const metadata = {
  title: "Settings — Awarely",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Settings & Architecture
        </h1>
        <p className="text-sm text-slate-500">
          Configure application preferences and review Phase 1 service integrations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-brand-600" />
                <CardTitle>Database (Supabase PostgreSQL)</CardTitle>
              </div>
              <Badge variant="success">Phase 2 Implemented</Badge>
            </div>
            <CardDescription>
              PostgreSQL schema, Route Handlers, and client utilities
            </CardDescription>
          </CardHeader>
          <div className="space-y-2 text-xs text-slate-600">
            <p>
              Status: <span className="font-semibold text-slate-800">Ready & Connected</span>
            </p>
            <p>Client: <code className="rounded bg-slate-100 px-1 py-0.5">lib/supabase/client.ts</code></p>
            <p>Server: <code className="rounded bg-slate-100 px-1 py-0.5">lib/supabase/server.ts</code></p>
            <p>Schema: <code className="rounded bg-slate-100 px-1 py-0.5">supabase/schema.sql</code></p>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudSun className="h-4 w-4 text-brand-600" />
                <CardTitle>Weather Integration (WeatherAPI)</CardTitle>
              </div>
              <Badge variant="warning">Phase 2 Planned</Badge>
            </div>
            <CardDescription>
              External weather provider and caching layer
            </CardDescription>
          </CardHeader>
          <div className="space-y-2 text-xs text-slate-600">
            <p>
              Status: <span className="font-semibold text-slate-800">Mock Mode Active</span>
            </p>
            <p>Client stub: <code className="rounded bg-slate-100 px-1 py-0.5">lib/weather/client.ts</code></p>
            <p className="text-slate-500">
              API key placeholder configured in <code className="rounded bg-slate-100 px-1 py-0.5">.env.example</code>.
            </p>
          </div>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              <CardTitle>CI/CD Automation Pipeline</CardTitle>
            </div>
            <CardDescription>
              Continuous integration via GitHub Actions
            </CardDescription>
          </CardHeader>
          <div className="space-y-2 text-xs text-slate-600">
            <p>
              Workflow: <code className="rounded bg-slate-100 px-1 py-0.5">.github/workflows/ci.yml</code>
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pt-1">
              <li>Triggers on Pull Requests and Pushes to <code className="font-mono text-slate-800">main</code></li>
              <li>Installs dependencies via <code className="font-mono text-slate-800">npm ci</code></li>
              <li>Runs ESLint static code analysis (<code className="font-mono text-slate-800">npm run lint</code>)</li>
              <li>Runs TypeScript typecheck (<code className="font-mono text-slate-800">npm run type-check</code>)</li>
              <li>Executes Next.js production build (<code className="font-mono text-slate-800">npm run build</code>)</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
