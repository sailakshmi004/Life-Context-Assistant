# Awarely — Production Checklist

Use this before and after deploying to a Hostinger (or any Ubuntu) VPS.

## 1. Release readiness

- [ ] Working tree committed and tagged, e.g. `git tag v0.2.0`
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes (currently 66 tests)
- [ ] `npm run build` passes
- [ ] CI green (lint, types, tests, build, Docker build)
- [ ] `.env` is **not** committed and is `chmod 600`
- [ ] No real secrets in `.env.example` or docs

## 2. Database

- [ ] Production Supabase project selected
- [ ] `supabase/schema.sql` applied **or** all migrations applied
- [ ] `activities`, `app_settings`, `notifications`, `push_subscriptions` exist
- [ ] RLS enabled on all four tables
- [ ] No public policies exist
- [ ] `notifications.type` includes `activity_completed`, `forecast_changed`,
      `weather_resolved`
- [ ] `app_settings.last_sync_at` exists
- [ ] Smoke test: create/update/delete an activity through the app
- [ ] Backup taken before the first production write

## 3. Environment

Required values:

- [ ] `SITE_ADDRESS` (direct mode) or existing proxy hostname
- [ ] `HTTP_PORT` / `HTTPS_PORT` (direct mode)
- [ ] `APP_PORT` (loopback)
- [ ] `APP_PASSCODE` (long, unique)
- [ ] `APP_SESSION_SECRET` (64 hex)
- [ ] `CRON_SECRET` (64 hex, different)
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `WEATHER_API_KEY`
- [ ] `VAPID_PUBLIC_KEY`
- [ ] `VAPID_PRIVATE_KEY`
- [ ] `VAPID_SUBJECT`

Optional:

- [ ] `DATABASE_URL` for `npm run db:migrate` (direct 5432 URI)

## 4. VPS / Hostinger

- [ ] Ubuntu updated; Docker + Compose installed
- [ ] `sudo ss -ltnp | grep -E ':80|:443|:3000'` checked
- [ ] `docker ps` checked for existing applications
- [ ] Ports 80/443 free **or** shared-proxy mode chosen
- [ ] Firewall allows only 22 and required proxy ports
- [ ] `APP_PORT` is bound to `127.0.0.1` only
- [ ] Existing applications were not stopped without approval

## 5. Deploy

Direct mode:

```bash
docker compose up -d --build
```

Shared-proxy mode:

```bash
docker compose up -d --build app scheduler
# existing proxy → http://127.0.0.1:$APP_PORT
```

- [ ] `docker compose ps` shows app healthy
- [ ] Caddy certificate issued (direct mode)
- [ ] `curl -fsS https://<host>/api/health` returns `database: connected`
- [ ] Logs show no startup errors
- [ ] Docker log rotation enabled (`10 MB × 3`)

## 6. Smoke test

- [ ] Unlock with the production passcode
- [ ] Dashboard loads live weather
- [ ] Create a monitored activity with a rainy window
- [ ] Settings → Run alert check → alert appears
- [ ] Notification has a clear reason + suggestion
- [ ] Activity detail shows weather checks and history
- [ ] Mark activity complete → completion notification appears
- [ ] Resolve/return a weather conflict if the forecast allows → resolved /
      forecast-changed events appear
- [ ] Enable push → Send test → notification arrives
- [ ] Scheduler logs show a successful sync every 10 minutes
- [ ] Settings shows a recent “Last alert check”

## 7. Security verification

- [ ] `http://` redirects to `https://` (direct mode)
- [ ] `Content-Security-Policy` header present
- [ ] Browser console has no CSP violations
- [ ] `/api/activities` unauth → 401
- [ ] `/api/notifications/sync` without cron secret → 401
- [ ] Wrong passcode → 401; repeated attempts → 429
- [ ] `robots.txt` disallows indexing
- [ ] Sessions: rotate `APP_SESSION_SECRET` to revoke all devices
- [ ] Supabase anon key cannot read tables (RLS)

## 8. Operations

- [ ] Backup schedule documented (Supabase backups or `pg_dump`)
- [ ] Restore tested in a staging project
- [ ] Update procedure documented (`git pull` + compose rebuild)
- [ ] Rollback tag/commit recorded
- [ ] Monitoring: `/api/health`, `docker compose ps`, logs
- [ ] `unattended-upgrades` enabled on the VPS
- [ ] Release tagged and pushed (if desired)

## 9. Rollback

```bash
git checkout <known-good-tag>
docker compose up -d --build
# shared-proxy: docker compose up -d --build app scheduler
```

If a migration changed the schema incompatibly, restore the database from the
latest verified backup in a staging project first.
