# Awarely — Life Context Assistant

> A private, context-aware activity assistant. It checks the forecast during an
> activity's actual time window and warns you **before** the task starts.

**Example:** you schedule “Drying Clothes” at 2:00 PM for 120 minutes. Awarely
sees a 75% chance of rain between 2:00–4:00 PM and creates an alert suggesting an
indoor drying rack — in-app and, optionally, as a browser push notification.

## Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** — Docker/Caddy VPS runbook
- **[docs/DEPLOYMENT_NATIVE.md](docs/DEPLOYMENT_NATIVE.md)** — Nginx + PM2 native VPS guide
- **[docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md)** — go-live checklist
- **[docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)** — 5-minute demo and interview talking points
- **[docs/PROJECT_AUDIT.md](docs/PROJECT_AUDIT.md)** — architecture audit and milestone history

---

## What works today

- **Activities** — create, edit, delete, filter with counts, search, upcoming/past
  views, status changes, and a detail drawer with weather checks and notification
  history.
- **Weather context** — live WeatherAPI forecast with a 15-minute cache; per-activity
  location or an app-wide default.
- **Rules engine** — hourly overlap between the activity window and the forecast,
  using UTC epochs so timezones cannot shift the match. Rules cover rain, heat,
  wind, and humidity, selected per activity type.
- **Persistent notifications** — weather conflicts, “starting soon” reminders,
  activity completion, forecast changes, and conflict resolutions, with
  read/dismiss state and automatic resolution when the forecast clears.
- **Browser push** — VAPID web push with a service worker, delivered by a
  scheduler container even when the site is closed.
- **Single-user passcode gate** — signed httpOnly cookie protecting every page and
  API route, plus locked-down database RLS.
- **Settings** — default location, alert generation, push enable/disable, manual
  sync, diagnostics, and “lock app”.
- **Self-hosted deployment** — Docker Compose + Caddy (automatic HTTPS) + scheduler.

---

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 14 (App Router), React 18, TypeScript (strict) |
| Styling | Tailwind CSS, Lucide icons |
| Database | Supabase PostgreSQL (service-role access behind the passcode gate) |
| Weather | WeatherAPI (forecast.json, 2 days, hourly) |
| Push | `web-push` + service worker + VAPID |
| Deployment | Docker, Docker Compose, Caddy |
| CI | GitHub Actions (lint, type-check, tests, build, Docker image) |

---

## Architecture

```
app/
  api/
    activities/            GET/POST, GET/PATCH/DELETE by id
    auth/unlock, auth/lock Passcode session cookie
    health/                Public liveness probe
    notifications/         List, sync, read-all, PATCH by id
    push/                  Public key, subscribe, unsubscribe
    settings/              GET/PATCH app settings
    weather/               Forecast for a location
  activities/              Activity management UI
  dashboard/               Context dashboard (also served at /)
  notifications/           Persisted alert feed
  settings/                Preferences, push, diagnostics, lock
  unlock/                  Passcode screen
  weather/                 Forecast explorer + geolocation
components/
  activities/  dashboard/  layout/  ui/
lib/
  auth/                    Session signing/verification, passcode, request guard
  notifications/           Candidate builder + server sync orchestration
  push/                    Server sender + browser subscription helpers
  rules/engine.ts          Forecast-vs-activity overlap evaluator
  supabase/                Server client + repositories
  weather/client.ts        WeatherAPI client with cache/fallback
  validations/activity.ts  Request payload validation
middleware.ts              Passcode gate for pages and API routes
public/sw.js               Push service worker
supabase/schema.sql        Full production schema
supabase/migrations/       Additive migration for existing databases
Dockerfile                 Multi-stage standalone build
docker-compose.yml         app + caddy + scheduler
Caddyfile                  Reverse proxy / automatic TLS
ecosystem.config.cjs       PM2 process definition (native deployment)
deploy/nginx/awarely.conf  Nginx site config (native deployment)
scripts/prepare-standalone.mjs  Copies public/static into standalone
scripts/run-sync.sh        Cron-driven notification sync
docs/DEPLOYMENT_NATIVE.md  Nginx + PM2 deployment guide
DEPLOYMENT.md              Docker/Caddy VPS runbook
```

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill in Supabase + WeatherAPI + secrets
npm run dev
```

Open <http://localhost:3000>. In development, if `APP_PASSCODE` is unset the
passcode defaults to **`awarely`**; production fails closed when it is missing.

### Useful scripts

```bash
npm run dev            # Next.js dev server
npm run build          # production build (standalone output)
npm run build:standalone # build + copy public/static into .next/standalone
npm start              # run the production build
npm run lint           # ESLint
npm run type-check     # tsc --noEmit
npm test               # 66 unit tests (rules, transitions, auth, timezone, lock)
npm run generate:secrets  # APP_* / CRON_SECRET / VAPID keys for .env
npm run db:migrate        # apply migration via DATABASE_URL (no SQL Editor)
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `SITE_ADDRESS` | Caddy hostname (direct mode) or `:80` for local HTTP |
| `HTTP_PORT` / `HTTPS_PORT` | Host ports for direct Caddy mode |
| `APP_PORT` | Loopback app port for shared-proxy mode |
| `APP_PASSCODE` | passphrase for the unlock screen |
| `APP_SESSION_SECRET` | HMAC key for 30-day session cookies |
| `CRON_SECRET` | scheduler → sync endpoint secret |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only database key (RLS bypass) |
| `WEATHER_API_KEY` | WeatherAPI key |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | web push |
| `DATABASE_URL` | optional direct Postgres URI for `npm run db:migrate` |

Never put server secrets in `NEXT_PUBLIC_*` variables. `.env.local` and `.env`
are gitignored.

### Testing

| Command | What it covers |
| --- | --- |
| `npm test` | 66 unit tests: rules, transitions, auth, rate limits, timezone, concurrency |
| `npm run type-check` | strict TypeScript |
| `npm run lint` | ESLint |
| `npm run build` | production build |
| CI Docker job | compose validation + production image build |

### Database

Open Supabase → SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql)
once. It creates:

- `activities` (with `location`)
- `app_settings` (single row)
- `notifications` (dedupe-keyed, read/dismiss state)
- `push_subscriptions` (VAPID endpoints)

RLS is enabled with **no public policies**, so the anon key cannot read or write.
The server uses `SUPABASE_SERVICE_ROLE_KEY` behind the passcode gate.

If you already have the older Phase 2 schema, apply the additive migrations in
order:

- [`supabase/migrations/20261124000000_production_hardening.sql`](supabase/migrations/20261124000000_production_hardening.sql)
- [`supabase/migrations/20261125000000_milestone3_notifications.sql`](supabase/migrations/20261125000000_milestone3_notifications.sql)

To apply the newest migration automatically instead of using the SQL Editor,
add the direct Postgres URI from **Supabase → Project Settings → Database →
Connection string** to `DATABASE_URL` in `.env.local` (use the port `5432` URI,
not the pooler), then run `npm run db:migrate`. Pass a file path to apply a
specific migration, or `supabase/schema.sql` for a fresh database.

---

## How alerts are produced

1. The dashboard, activity mutations, the Settings button, and the scheduler all
   call `POST /api/notifications/sync`.
2. The sync groups active activities by location (activity location → default).
3. Weather is fetched per location and cached for 15 minutes. **Fallback
   (synthetic) weather is never used to create alerts in production.**
4. Each activity is evaluated against the hourly forecast overlapping its
   `start_time … start_time + duration`.
5. New alerts get a stable dedupe key (`weather:<activityId>:<startTime>` or
   `reminder:<activityId>:<startTime>`), so frequent runs cannot spam.
6. Newly inserted rows are delivered as one push digest (if push is enabled).
7. If the forecast for an existing alert changes, the alert is refreshed and a
   `forecast_changed` event is recorded. If a resolved conflict returns, it is
   reactivated.
8. Upcoming weather alerts that no longer match the forecast are dismissed and
   a `weather_resolved` event is recorded.
9. Marking an activity complete records `activity_completed` and dismisses its
   active weather/reminder alerts.
10. A sync lock prevents overlapping runs; the last sync time/status is shown in
    Settings.

The scheduler container runs this every 10 minutes, so delivery does not depend
on an open browser tab. Past notifications remain as history.

---

## Security model

- Single user, **no public sign-up**. One passcode unlocks a 30-day signed cookie.
- Every page and `/api/*` route is protected by `middleware.ts` (only
  `/api/health`, the unlock route, and static assets are public).
- The scheduler authenticates with `x-cron-secret: $CRON_SECRET`.
- Supabase RLS is enabled with no policies; only the server service-role key
  bypasses it.
- Unlock attempts are rate-limited; the passcode comparison is constant-time.
- `robots.txt` disallows indexing; pages are marked `noindex`.
- Rate limiting is process-local; run a single app container unless you replace it
  with a shared limiter.
- Changing `APP_PASSCODE` alone does **not** revoke existing sessions. Rotate
  `APP_SESSION_SECRET` to invalidate every session immediately.
- Public 500 responses return stable messages; database/provider details are logged
  server-side only.
- A Content-Security-Policy restricts scripts, connections, frames, and images to
  the app and the WeatherAPI icon CDN.

---

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the full runbook:

```bash
cp .env.example .env      # fill values, chmod 600
npm run generate:secrets  # or openssl / web-push generate-vapid-keys
docker compose up -d --build
```

Caddy obtains HTTPS automatically in direct mode. Without a domain, use
`awarely.<YOUR_SERVER_IP>.sslip.io`. If the VPS already runs a reverse proxy,
use shared-proxy mode: set `APP_PORT` and run
`docker compose up -d --build app scheduler`; see `DEPLOYMENT.md`.

**Prefer no Docker?** Use the native guide:
[docs/DEPLOYMENT_NATIVE.md](docs/DEPLOYMENT_NATIVE.md). It uses Node 20 + PM2 +
Nginx + Certbot + cron, with the same `.env` and Supabase database.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| “Server is not configured” | Set `APP_PASSCODE` and `APP_SESSION_SECRET`; restart |
| Database unavailable | Check `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`; run the schema |
| `Could not find the table ...` | Apply the SQL migrations |
| Weather always fallback | Invalid/quota-limited `WEATHER_API_KEY` |
| No alert for an activity | Monitoring off, no overlapping rule, or activity outside the 2-day forecast |
| No push | HTTPS/localhost, permission granted, VAPID keys configured |
| “Notifications are blocked” | Allow notifications for the site in browser site settings, then reload |
| Scheduler not syncing | `docker compose logs scheduler`; verify `CRON_SECRET` |
| Port 80/443 in use | Use shared-proxy mode with `APP_PORT`, or free ports |

---

## Roadmap

### Current limitations

- Rule sets are derived from activity category/title; explicit overrides are not stored.
- Recurring activities are not implemented.
- Weather forecasts cover two days; further-out activities show no alert.
- Push is per-deployment; there is no multi-user account model.
- Optional email/SMS notifications are not implemented.

### Next ideas

1. Explicit per-activity rule editor (stored rule set)
2. Recurring activities and schedule templates
3. Calendar import (Google/Outlook)
4. Email/Slack/SMS delivery channels
5. Per-activity timezones and travel-aware location handling
6. More provider data: air quality, UV, storms
7. Admin analytics for alert usefulness
8. Multi-user accounts with per-user RLS
