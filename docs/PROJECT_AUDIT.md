# Awarely — Project Audit

**Audit date:** 2026-11-25  
**Application:** Awarely — Life Context Assistant  
**Target deployment:** Self-hosted Hostinger VPS (Ubuntu) with Docker + Caddy  
**Auditor:** Senior full-stack / security review

---

## 0. Executive summary

Awarely is a private, single-user, context-aware activity assistant. The core idea is
strong and already implemented: an activity's scheduled time window is compared
against the hourly forecast, and a warning is generated before the activity starts.

The repository is in **good shape for local use and close to production-ready**, but it
is **not yet a finished production system**. The current working tree contains a large,
uncommitted v0.2 improvement set (passcode gate, notifications, push, settings, Docker,
tests). That must be committed before any deployment work.

**Current baseline (actually run during this audit):**

| Check | Result |
|---|---|
| `npm run type-check` | ✅ passed |
| `npm run lint` | ✅ passed (no warnings) |
| `npm test` | ✅ 21/21 passed |
| `npm run build` | ✅ passed (Next.js 14.2.35, standalone output) |
| Docker image build | ⚠️ not run — Docker is not installed in this environment |
| Docker Compose syntax | ✅ parsed successfully |
| Local end-to-end smoke test | ✅ login, DB, weather, activities, alert generation verified earlier |

**Overall readiness:** approximately **70%** production-ready. The remaining work is
mainly reliability, per-activity rules, notification completeness, Hostinger-safe
deployment, and test coverage.

> **Update — Milestone 2 completed (2026-11-25):**
> - Rule registry now evaluates rain, heat, wind, and humidity independently.
> - Rule sets are selected per activity category/title (explicit overrides deferred).
> - Activity form now accepts an end time (still stores duration).
> - Added midnight-crossing, fallback/no-data, out-of-range, heat, wind, and
>   humidity tests. Test suite is now **31/31**.
> - `.env.example` stale trailing section cleaned.
> - No database migration was required for this milestone.

> **Update — Milestone 3 completed (2026-11-25):**
> - Added notification types `activity_completed`, `forecast_changed`,
>   `weather_resolved`.
> - Activity completion now creates a completion notification and dismisses
>   stale weather/reminder alerts.
> - Forecast changes update the active alert and create a forecast-change event;
>   returning conflicts reactivate the alert.
> - Cleared conflicts dismiss the alert and create a resolution notification.
> - Added an in-process sync lock plus last-sync status/error in settings.
> - Scheduler now has timeouts, retries, and Docker log rotation.
> - Added notification-transition tests. Test suite is now **38/38**.
> - **Manual action:** apply `supabase/migrations/20261125000000_milestone3_notifications.sql`
>   (via `npm run db:migrate` or the Supabase SQL Editor) to enable the new
>   notification types and sync-state columns.

> **Update — Milestone 4 completed (2026-11-25):**
> - Activities filters now use dynamic facet counts (categories/statuses with
>   counts, zero-count options disabled, auto-reset if a selection disappears).
> - Added Upcoming / Past / All time scopes.
> - Added an Activity detail modal with schedule, end time, location, weather
>   checks, and notification history.
> - Added a Details action to activity rows.
> - Modal now has focus trapping, Escape handling, focus restoration, and
>   aria-labelledby/describedby.
> - Activity form fields now have labels, IDs, and error associations.
> - Added dashboard alert/reminder loading skeletons.
> - Clarified that the dashboard weather dropdown is a preview only.
> - Extracted `ActivityFilters`, `ActivityDetailModal`, and settings status
>   cards to reduce large component files.
> - No schema migration was required for this milestone.

> **Update — Milestone 5 completed (2026-11-25):**
> - Added a Content-Security-Policy (same-origin scripts/connect, WeatherAPI icon
>   CDN allowed, frames/objects blocked, no eval in production).
> - Added constant-time scheduler-secret comparison in Edge middleware.
> - Extracted and tested the fixed-window login rate limiter.
> - Sanitized all public 500 responses; internal DB/provider details are logged
>   server-side only.
> - Extracted the notification sync lock into a tested `SingleFlight` helper.
> - Added tests for session signing/expiry/tampering, passcode comparison,
>   rate limits, error sanitisation, placeholder fail-closed behavior, stale-alert
>   selection, daily-summary fallback, and single-flight concurrency.
> - Test suite is now **66/66**.
> - Documented passcode/session rotation in README and DEPLOYMENT.
> - No schema migration was required for this milestone.

> **Update — Milestone 6 completed (2026-11-25):**
> - Host ports are configurable: `HTTP_PORT`, `HTTPS_PORT`, `APP_PORT`.
> - The app binds only to `127.0.0.1:APP_PORT`, enabling shared-proxy deployments
>   without exposing it publicly.
> - Added direct-Caddy and shared-proxy deployment modes to `DEPLOYMENT.md`,
>   including Hostinger coexistence checks and an Nginx example.
> - Added update, rollback, clean-clone verification, backup, and restore steps.
> - Added Docker log rotation, `stop_grace_period`, `no-new-privileges`, and
>   capability drops for the app/scheduler.
> - CI now validates `docker compose config` and builds the production image.
> - Docker image build was **not executed locally** because Docker is unavailable
>   in this environment; CI performs that build.
> - No schema migration was required for this milestone.

> **Update — Milestone 7 completed (2026-11-25):**
> - Milestone 3 migration was applied; `lastSyncAt` is now populated.
> - Verified all notification types end-to-end against the real database:
>   weather alert, resolved, forecast-changed/returned, and activity completed.
> - Added `docs/DEMO_SCRIPT.md` (portfolio/interview walkthrough).
> - Added `docs/PRODUCTION_CHECKLIST.md` (go-live, security, rollback).
> - Final README: documentation index, environment table, testing matrix,
>   troubleshooting, deployment modes, and roadmap.
> - Final verification: 66/66 tests, lint, type-check, production build, compose
>   validation, CSP header, cron auth, and protected APIs.
> - Docker image build remains CI-only in this environment.
> - Release tag/commit recommended before the first production deploy.

---

## 1. Current architecture

```
Browser
  │
  ├─ Next.js App Router (React 18, TypeScript, Tailwind)
  │    ├─ /dashboard, /activities, /weather, /notifications, /settings, /unlock
  │    └─ Client components call same-origin /api/* routes
  │
  ├─ middleware.ts  (Edge)
  │    └─ Passcode session cookie gate for every page and API route
  │
  ├─ API route handlers (Node.js runtime)
  │    ├─ /api/auth/*          passcode unlock/lock
  │    ├─ /api/activities/*    CRUD
  │    ├─ /api/weather         WeatherAPI proxy + cache
  │    ├─ /api/notifications/* list, read, dismiss, sync
  │    ├─ /api/push/*          VAPID key, subscribe, unsubscribe, test
  │    ├─ /api/settings        singleton app settings
  │    └─ /api/health          public liveness probe
  │
  ├─ Domain logic
  │    ├─ lib/rules/engine.ts             weather-vs-activity evaluation
  │    ├─ lib/notifications/engine.ts     pure notification candidates
  │    ├─ lib/notifications/sync.ts       orchestration + push
  │    └─ lib/weather/client.ts           WeatherAPI client + cache + fallback
  │
  ├─ Data access (server-only)
  │    └─ lib/supabase/*                  service-role repositories
  │
  └─ Supabase PostgreSQL
       ├─ activities
       ├─ app_settings
       ├─ notifications
       └─ push_subscriptions
```

**Scheduled flow (production):**

```
docker compose scheduler (curl loop, every 10 min)
  → POST /api/notifications/sync  (x-cron-secret)
    → load settings + activities
    → group active activities by location
    → fetch WeatherAPI forecast per location (15-min in-memory cache)
    → evaluate overlapping hourly forecast against each activity window
    → idempotently insert notification candidates (dedupe_key unique)
    → auto-resolve upcoming weather alerts that no longer apply
    → send one web-push digest to all subscriptions (if enabled)
```

**Deployment flow (intended):**

```
Internet :443
  → Caddy (automatic HTTPS, reverse proxy)
    → app container (Next.js standalone, :3000)
  → Supabase hosted PostgreSQL
  → WeatherAPI
scheduler container → app:3000/api/notifications/sync
```

---

## 2. Existing features

### Complete / working

- **Single-user passcode gate** with signed HttpOnly session cookie
- **Activity CRUD** with validation, search, filters, status changes
- **Per-activity location** (falls back to default location)
- **WeatherAPI integration** with 15-minute in-memory cache and neutral fallback
- **Hourly overlap rules engine** for rain probability / rain conditions
- **Timezone-safe matching** using WeatherAPI UTC `time_epoch`
- **Persisted notifications**:
  - weather conflicts
  - “starting soon” reminders (within 60 minutes)
  - read / unread / dismiss state
  - idempotent dedupe keys
  - automatic resolution of stale upcoming weather alerts
- **Web push**:
  - VAPID keys
  - service worker
  - subscribe / unsubscribe
  - expired subscription cleanup on 404/410
  - test-notification endpoint
- **Settings**:
  - default location
  - alert generation toggle
  - push enable/disable
  - manual sync
  - system diagnostics
  - lock app
- **Weather page** with city search and browser geolocation
- **Dashboard** with today/all scope, alert section, weather card, reminders
- **Production plumbing**:
  - Dockerfile (standalone, non-root, healthcheck)
  - Docker Compose (app + Caddy + scheduler)
  - Caddy automatic HTTPS
  - security headers
  - PWA manifest, icon, robots
  - error / loading / not-found pages
- **CI**: install, lint, type-check, tests, build
- **Migration tooling**: `supabase/schema.sql`, additive migration, `npm run db:migrate`

### Partial / incomplete

- **Rules engine only evaluates rain.** Heat, wind, and humidity types exist in the
  domain model but are not evaluated.
- **No per-activity rule configuration.** Rules are implied by `monitoring_enabled`
  and by matching words in the activity title.
- **Activity system has duration, not explicit end time.** End time is derived.
- **No recurrence support.**
- **No activity detail page** (editing happens in a modal).
- **No dedicated past/upcoming views**; the dashboard has Today/All only.
- **Notification types are limited** to `weather_alert`, `reminder`, `system`.
  There is no completion notification, forecast-changed notification, or explicit
  “weather conflict resolved” notification.
- **Scheduler is a curl loop**, with no overlap lock, retry/backoff, or run history.
- **Hostinger-specific deployment is not documented yet** (ports, coexistence with
  other apps, firewall, log rotation, backups, rollback).

---

## 3. Current technology stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router (installed 14.2.35) |
| UI | React 18, TypeScript strict, Tailwind CSS 3, Lucide icons |
| Database | Supabase PostgreSQL, `@supabase/supabase-js` 2.x |
| Weather | WeatherAPI `forecast.json` (2 days, hourly) |
| Push | `web-push`, service worker, VAPID |
| Auth | Custom passcode + HMAC-signed cookie (single user) |
| Validation | Hand-written validators in `lib/validations/activity.ts` |
| Testing | `tsx` test runner, pure-function unit tests |
| CI | GitHub Actions |
| Deployment | Docker multi-stage, Docker Compose, Caddy |
| Scheduler | `curlimages/curl` loop container |
| Migrations | SQL + `pg` script (`npm run db:migrate`) |

No duplicate or unnecessary framework was introduced. The stack matches the project
vision and should be preserved.

---

## 4. Important files and responsibilities

| File / folder | Responsibility |
|---|---|
| `middleware.ts` | Passcode session gate; public allow-list; cron bypass for sync |
| `app/layout.tsx` | Root metadata, PWA registration, app shell |
| `app/unlock/page.tsx` | Passcode screen |
| `app/dashboard/page.tsx`, `components/dashboard/*` | Dashboard composition |
| `app/activities/page.tsx` | Activity list, filters, modals |
| `app/weather/page.tsx` | Forecast explorer, city search, geolocation |
| `app/notifications/page.tsx` | Notification feed and actions |
| `app/settings/page.tsx` | Preferences, push, sync, diagnostics, lock |
| `app/api/**` | Route handlers (validation, auth, error handling) |
| `lib/rules/engine.ts` | Core weather-vs-activity overlap evaluation |
| `lib/notifications/engine.ts` | Pure candidate generation and dedupe keys |
| `lib/notifications/sync.ts` | Server sync orchestration and push digest |
| `lib/weather/client.ts` | WeatherAPI mapping, cache, neutral fallback |
| `lib/supabase/server.ts` | Service-role Supabase client (server only) |
| `lib/supabase/activities.ts` | Activity repository |
| `lib/supabase/notifications.ts` | Notification repository |
| `lib/supabase/settings.ts` | Singleton settings repository |
| `lib/auth/*` | Session signing/verification, passcode, cron guard |
| `lib/push/*` | Server sender and browser subscription helpers |
| `types/index.ts` | Domain types (camelCase + row types) |
| `supabase/schema.sql` | Full current schema |
| `supabase/migrations/20261124000000_production_hardening.sql` | Additive migration |
| `scripts/apply-migration.mjs` | Programmatic migration runner |
| `scripts/generate-secrets.mjs` | APP/CRON/VAPID secret generator |
| `Dockerfile` | Multi-stage standalone production image |
| `docker-compose.yml` | `app` + `caddy` + `scheduler` |
| `Caddyfile` | Reverse proxy + automatic TLS |
| `DEPLOYMENT.md` | VPS deployment runbook |
| `README.md` | Project overview and local development |
| `.github/workflows/ci.yml` | CI quality gate |

---

## 5. Data model summary

| Table | Purpose | Notes |
|---|---|---|
| `activities` | Scheduled activities | `start_time` + `duration_minutes`; optional `location`; no recurrence |
| `app_settings` | Single-row app preferences | default location, alert/push toggles |
| `notifications` | Persisted alerts/reminders | `dedupe_key` unique; read/dismiss; no structured rule metadata |
| `push_subscriptions` | Web-push endpoints | endpoint unique; dead endpoints pruned |

**Security model:** RLS is enabled on all tables with **no policies**. The browser
never accesses Supabase directly; the server uses the service-role key behind the
passcode gate.

**Migration state:**
- `schema.sql` is the full current schema.
- `20261124000000_production_hardening.sql` is additive for existing databases.
- The older `20261107000000_create_activities_table.sql` still contains seed inserts
  with `ON CONFLICT DO NOTHING` but no matching unique constraint. Re-running it can
  create duplicate seed rows.
- There is no migration ledger/CLI configuration. `npm run db:migrate` applies one
  file at a time and does not record what has run.

---

## 6. Bugs, limitations, and technical debt

### High priority

1. **Working tree is uncommitted.**  
   Git `HEAD` is still the Phase 3 commit. All v0.2 production-hardening work exists
   only in the working tree. Deploying now would deploy the wrong code. Commit or
   branch before any deployment.

2. **Rules engine only handles rain.**  
   The product vision explicitly includes heat, wind, and humidity. Current alerts
   are rain-only and suggestions depend on substring matching of the activity title
   (`clothes`, `car`, `jog`, `plant`). This is fragile and does not scale.

3. **No per-activity environmental rules.**  
   An outdoor run and drying clothes should not share the same thresholds. There is
   no stored rule configuration per activity.

4. **No recurrence.**  
   The prompt asks for it “if supported”. It is not currently supported. This is a
   product decision and requires a schema change.

5. **No explicit end time in the activity model/UI.**  
   Duration is used, which is equivalent for calculations, but users may expect to
   enter an end time. The UI should support start + end while storing duration.

6. **Hostinger port conflict risk.**  
   `docker-compose.yml` binds host ports `80` and `443` directly. If the VPS already
   runs Nginx/Apache/Coolify/another Caddy, deployment will fail or hijack traffic.
   Ports should be configurable and the runbook must check for existing services.

### Medium priority

7. **Notification model is incomplete vs. the prompt.**  
   Missing: activity-completed notification, forecast-changed notification, explicit
   “weather conflict resolved” notification. Stale alerts are silently dismissed.

8. **Scheduler reliability.**  
   The curl loop has no overlap lock, timeout, retry/backoff, or run history. Dashboard
   page loads also call sync, so scheduler and UI syncs can overlap. Database dedupe
   prevents duplicate notifications, but weather calls can be duplicated.

9. **No structured rule evidence.**  
   Notifications contain a human message and suggestion, but not structured fields
   such as rule code, threshold, observed value, and forecast hours. This makes the
   UI and future analytics harder.

10. **Timezone handling is only partially solved.**  
    Forecast matching correctly uses UTC epochs, but activities have no explicit
    timezone, and display time uses the viewer’s browser timezone. Midnight-crossing
    activities work in principle but are not covered by tests.

11. **`schema.sql` and migrations overlap.**  
    No single source of truth for migration history. Risk of duplicate seeds and
    “works on my machine” schema drift.

12. **`.env.example` has a stale duplicated section at the bottom** (old header and
    unused `NEXT_PUBLIC_APP_URL`). This is confusing and should be cleaned.

13. **Raw database/provider errors can be returned to the client** in 500 responses
    (`error.message`). Low exploitability behind the passcode, but it leaks schema
    and provider details.

14. **No Content-Security-Policy.**  
    Other security headers are present, but CSP is missing.

15. **Large UI components.**  
    `app/settings/page.tsx` (500+ lines) and `components/dashboard/DashboardView.tsx`
    (400+ lines) would benefit from extraction into focused components.

16. **No log rotation or structured logging.**  
    Docker’s default `json-file` logs can grow; app logs are plain `console.*`.

### Low priority

17. In-memory rate limiting and weather cache are per-process. Fine for one container,
    but not safe for horizontal scaling.
18. `weatherAlertTriggered` and some types (`NavigationItem`, `PushSubscriptionInput`,
    `existingDedupeKeys`) are unused or partially used.
19. `next start` warns because `output: "standalone"` is set; Docker uses
    `node server.js`, but local production preview is slightly awkward.
20. No Docker image build in CI.
21. No component/API integration/E2E test suite.
22. `tests/supabase-connection.test.ts` is a manual script, not part of `npm test`.

---

## 7. Security review

### Strengths

- Passcode gate protects **pages and API routes** via Edge middleware.
- Session cookie is **HttpOnly**, `SameSite=Lax`, path-scoped, 30-day expiry.
- `Secure` is derived from the actual request (`x-forwarded-proto` / URL protocol),
  so HTTPS deployments get Secure cookies while local HTTP still works.
- Session token is HMAC-SHA256 signed over the expiry; verification is constant-time
  via Web Crypto.
- Passcode comparison uses SHA-256 + `timingSafeEqual`; unlock attempts are rate-limited.
- Production fails closed when passcode/session secret are missing or still template
  values.
- Supabase service-role key is server-only; no `NEXT_PUBLIC_` secrets.
- RLS is enabled on all tables with **no public policies**.
- Scheduler endpoint is protected by `x-cron-secret` (route-level timing-safe check).
- Docker image runs as a non-root user.
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS.
- Push subscriptions are pruned on 404/410; service worker is served no-cache.

### Concerns / improvements

1. **No CSP.** Add a carefully tested Content-Security-Policy.
2. **Raw error messages** from Supabase/WeatherAPI are returned to clients. Sanitize
   public errors and log details server-side.
3. **Middleware cron comparison** uses plain string equality; the route uses the
   timing-safe helper. Low risk, but unify.
4. **Session revocation:** changing `APP_PASSCODE` alone does not invalidate existing
   sessions (the token is signed only with `APP_SESSION_SECRET`). Document rotation or
   bind a passcode fingerprint into the token.
5. **Rate limiting is in-memory** and resets on restart. Acceptable for one container;
   note it in docs.
6. **No CSRF token.** SameSite=Lax + JSON-only APIs + same-origin fetches make this
   acceptable for a single-user app, but document the assumption.
7. **Service-role key has full DB access.** The passcode gate is the only barrier; any
   bypass of middleware/API auth exposes all data. Keep middleware coverage tests.
8. **`.env.local` contains real secrets** and is correctly gitignored. Ensure it is
   never copied into the Docker image or committed. `.dockerignore` covers `.env.*`.
9. **`/api/health` is public** but intentionally returns only coarse status. Fine.

---

## 8. Deployment readiness

### Already prepared

- Multi-stage `Dockerfile` using Next.js standalone output.
- Non-root runtime user, healthcheck, production env, telemetry disabled.
- `docker-compose.yml` with `app`, `caddy`, `scheduler`.
- Caddy automatic HTTPS, gzip/zstd, reverse proxy, server header removal, logs.
- Scheduler protected by `CRON_SECRET`.
- Environment template, secret generator, migration script.
- `DEPLOYMENT.md` runbook with sslip.io option.
- App is stateless; Supabase remains externally hosted.

### Gaps before Hostinger deployment

1. **Not committed.** Deployment would use old code. Commit v0.2 first.
2. **Port conflicts.** Compose assumes host ports 80/443 are free. Make them
   configurable (`HTTP_PORT`, `HTTPS_PORT`) and document coexistence with existing
   Nginx/Caddy/Coolify apps.
3. **Docker image never built here.** Docker is unavailable in this environment.
   Build and run it on the VPS or a Docker-enabled machine before go-live.
4. **No log rotation.** Add Compose logging limits or a log driver.
5. **No backup/rollback section** specific to Supabase + this app.
6. **No staging environment.** Recommend deploying first to a temporary hostname /
   sslip.io and running the smoke checklist.
7. **No monitoring/alerting.** At minimum, document `docker compose ps`,
   `/api/health`, and scheduler logs.
8. **DNS/HTTPS prerequisites** must be clear: Hostinger firewall ports 80/443, DNS or
   sslip.io hostname, Caddy certificate issuance.
9. **Supabase migration strategy** must be documented for the server (SQL Editor or
   `npm run db:migrate` with `DATABASE_URL` set on the server).
10. **Secrets handling on the VPS:** `.env` with `chmod 600`; never in Git; no
    `NEXT_PUBLIC_` secrets.

### Hostinger coexistence checklist (to add to runbook)

- Check listeners: `sudo ss -ltnp | grep -E ':80|:443'`
- Check containers: `docker ps`
- If ports are occupied, either:
  - use configurable host ports and an existing reverse proxy, or
  - attach Awarely to the existing proxy network, or
  - stop the conflicting service only with explicit approval.
- Open only 22, 80, 443 in the Hostinger firewall.
- Use a dedicated `COMPOSE_PROJECT_NAME=awarely`.

---

## 9. Testing status

**Actually run during audit:**

- `npm run type-check` → passed
- `npm run lint` → passed
- `npm test` → 21/21 passed
- `npm run build` → passed

**Existing coverage:**

- Rain rule evaluation
- Forecast overlap matching
- Timezone epoch regression
- Notification candidate generation and dedupe keys
- Default-location inheritance
- Activity payload validation
- Completed-activity suppression

**Missing coverage (Milestone 5):**

- Midnight-crossing activities
- Activities outside the forecast range
- Missing/stale forecast handling
- Heat/wind/humidity rules (once added)
- Notification repository dedupe/resolution (needs DB or mock)
- Scheduler overlap/idempotency
- Auth middleware protection and session expiry
- API route validation/error paths
- Component/UI tests
- Docker image smoke test

---

## 10. Recommended improvement plan

### Milestone 1 — Audit and plan (this document)

**Status:** complete.  
**Deliverable:** `docs/PROJECT_AUDIT.md`.  
**No application behavior changed.**

### Milestone 2 — Core activity and weather reliability

**Goal:** make the core product trustworthy.

Changes:

1. Refactor `lib/rules/engine.ts` into rule modules:
   - rain (probability + condition + precipitation)
   - heat (feels-like/max temperature)
   - wind (gust/speed)
   - humidity where relevant
2. Return **structured findings**: rule code, severity, threshold, observed value,
   affected hours, reason, suggestion.
3. Add **per-activity rule configuration** (recommended: `rule_types text[]` or JSONB
   on `activities` with category-based defaults).
4. Add explicit **end-time input** in the form (derive duration; no schema change
   needed unless you want `end_time` stored).
5. Decide on recurrence. If yes, add a recurrence schema and generation logic.
6. Add tests for midnight crossing, missing forecast, stale forecast, heat, wind,
   humidity, and multi-day windows.
7. Clean `.env.example` duplicate section.
8. Improve fallback/stale-data indicators in the UI.

**Affected files:** `lib/rules/*`, `types/index.ts`, `lib/notifications/engine.ts`,
`components/activities/ActivityFormModal.tsx`, `lib/validations/activity.ts`,
`supabase/migrations/*`, tests.

### Milestone 3 — Notifications and scheduler reliability

Changes:

1. Add notification types:
   - `activity_completed`
   - `forecast_changed`
   - `weather_resolved`
2. Create completion notifications when status changes to completed.
3. Detect forecast changes and either update the existing alert or create a
   `forecast_changed` notification with a stable dedupe key.
4. Create a resolved notification when an active weather conflict clears.
5. Add a **sync lock** (DB advisory lock or `sync_runs` table) to prevent overlapping
   scheduler/UI syncs.
6. Add timeout, retry/backoff, and structured logs to the scheduler flow.
7. Expose last-successful-sync time in Settings/health.
8. Keep dedupe/idempotency guarantees.

**Affected files:** `lib/notifications/*`, `lib/supabase/notifications.ts`,
`app/api/notifications/*`, `docker-compose.yml`, scheduler script, settings UI.

### Milestone 4 — UI and UX polish

Changes:

1. Activity detail view (page or drawer) with weather context and status history.
2. Upcoming / past / all views.
3. Split `Settings` and `DashboardView` into smaller components.
4. Add loading skeletons for initial dashboard weather/alerts.
5. Improve modal accessibility: focus trap, `aria-labelledby`, escape/backdrop
   behavior, form error association.
6. Clarify preview weather vs. alert/default location in the UI.
7. Useful empty states and error copy.

**Affected files:** dashboard/settings components, activity components, `Modal`.

### Milestone 5 — Security and testing hardening

Changes:

1. Add CSP (test push/service worker and Next.js inline scripts carefully).
2. Sanitize client-facing error messages; log details server-side.
3. Unify timing-safe cron checks.
4. Add auth middleware tests, session expiry tests, API validation tests.
5. Add notification dedupe/resolution tests (DB-backed or mocked repository).
6. Add scheduler idempotency/overlap tests.
7. Add midnight/timezone/missing-weather tests.
8. Document session/passcode rotation.
9. Keep `npm audit` findings reviewed.

### Milestone 6 — Docker and Hostinger VPS deployment

Changes:

1. Make host ports configurable (`HTTP_PORT`, `HTTPS_PORT`).
2. Add Compose log rotation, scheduler healthcheck, restart policies, and
   `stop_grace_period`.
3. Document coexistence with existing Nginx/Apache/Coolify/Caddy services.
4. Add production `.env` checklist and `chmod 600`.
5. Add update, rollback, backup, and restore instructions.
6. Add Hostinger-specific DNS/firewall/Caddy steps (sslip.io fallback).
7. Build and smoke-test the Docker image on a Docker-enabled machine.
8. Consider a CI job that builds the image (no push required).
9. Verify `docker compose up -d --build` from a clean clone.

### Milestone 7 — Documentation and production verification

Changes:

1. Final README with architecture diagram, screenshots, demo script, env table,
   troubleshooting, and roadmap.
2. `docs/DEPLOYMENT_HOSTINGER.md` or extend `DEPLOYMENT.md`.
3. Final lint/type/test/build + Docker smoke test.
4. Deploy to a staging hostname, run the smoke checklist, then production.
5. Commit/tag the release and record rollback steps.

---

## 11. Decisions needed before Milestone 2

1. **Per-activity rules:** add explicit `rule_types`/JSONB configuration, or derive
   rules from category + title?  
   *Recommendation: explicit configuration with sensible category defaults.*
2. **Explicit end time:** add an end-time input that derives duration (no schema
   change), or store both `start_time` and `end_time`?  
   *Recommendation: end-time input, keep duration as the stored canonical field.*
3. **Recurrence:** implement now or defer?  
   *Recommendation: defer until the core rules/notifications are solid.*
4. **Notification types:** approve adding `activity_completed`, `forecast_changed`,
   and `weather_resolved` (requires a check-constraint migration).
5. **Hostinger:** are ports 80/443 free, do you have a domain, and are other apps
   running on the VPS? This determines whether we use direct Caddy ports or a shared
   proxy network.
6. **Commit strategy:** commit the current v0.2 working tree before further changes?
   *Recommendation: yes, commit/tag first.*
7. **Migration tooling:** keep `npm run db:migrate`, or adopt Supabase CLI with a
   migration ledger?  
   *Recommendation: keep the script short-term; add a `schema_migrations` ledger or
   adopt Supabase CLI in Milestone 6.*

---

## 12. Manual actions currently needed

- Restart the local server after the audit checks: `npm run dev`.
- Keep `.env.local` private (contains real Supabase/WeatherAPI/VAPID values).
- Ensure `.env.example` remains placeholder-only (it currently contains a stale
  duplicated trailing section; scheduled for cleanup in Milestone 2).
- Before deployment: commit the working tree, create `.env` on the VPS, run the
  database migration if the production Supabase project differs, and confirm ports
  80/443 are free.

---

## 13. What will not change without approval

- The existing technology stack
- Existing activity CRUD behavior
- Existing notification/push behavior
- The passcode/security model
- Database schema (except through explicit, reviewed migrations)
- Existing UI structure beyond the documented polish work

The next step is **approval of Milestone 2 scope and the decisions in section 11**.
