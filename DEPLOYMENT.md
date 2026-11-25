# Deploying Awarely on a self-hosted Hostinger VPS

Awarely supports two deployment modes:

**Direct mode (recommended when ports 80/443 are free):**

```
Internet ──443──> Caddy (auto HTTPS) ──> Next.js app (Docker, :3000)
                                              │
                                              ├─ Supabase (Postgres + RLS)
                                              ├─ WeatherAPI
                                              └─ scheduler container (every 10 min)
```

**Shared-proxy mode (when the VPS already runs Nginx/Caddy/Coolify):**

```
Internet ──443──> existing reverse proxy ──> 127.0.0.1:APP_PORT
                                                   │
                                                   └─ Awarely app + scheduler
```

In direct mode, Caddy obtains and renews TLS certificates automatically. You do
**not** need a domain to start: an `sslip.io` hostname gives you real HTTPS
immediately.

> **Do not assume the VPS is empty.** Check for existing listeners before
> starting Caddy. The compose file binds the app only to `127.0.0.1:APP_PORT`, so
> an existing proxy can reach it without exposing the app publicly.

---

## 0. What you need

- A Linux VPS (Ubuntu 22.04/24.04, 1 vCPU / 1 GB RAM is enough) with a public IPv4.
- Either free ports **80/443** (direct mode) or an existing reverse proxy
  (shared-proxy mode).
- A Supabase project (free tier is fine).
- A WeatherAPI key (free tier is fine).

> Browser push requires HTTPS. It works on the `sslip.io` hostname and on a
> real domain. Plain `http://<ip>` will not allow push.

---

## 0.1 Check the VPS before deploying

```bash
# What is already listening on the usual ports?
sudo ss -ltnp | grep -E ':80|:443|:3000'

# What containers already exist?
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'

# Firewall status (Hostinger/Ubuntu)
sudo ufw status
```

- If **80/443 are free** → direct mode.
- If **80/443 are occupied** → shared-proxy mode, and use a free `APP_PORT`
  (for example `3100`).
- Never stop another application’s service without explicit approval.

---

## 1. Pick your HTTPS address

**No domain (fastest):** use your server IP inside `sslip.io`:

```
awarely.203.0.113.10.sslip.io
```

Replace `203.0.113.10` with your VPS public IP. No DNS setup is required;
`sslip.io` resolves that name to the IP automatically. Caddy will obtain a
Let's Encrypt certificate for it.

**Real domain:** create an `A` record (e.g. `awarely.example.com`) pointing at
the VPS IP. Use that name as `SITE_ADDRESS`.

Later, switching from `sslip.io` to a real domain is just an `.env` change plus
`docker compose up -d`.

---

## 2. Install Docker on the VPS

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
# log out and back in, then:
docker --version
docker compose version
```

---

## 3. Get the code onto the server

```bash
sudo mkdir -p /opt/awarely
sudo chown "$USER":"$USER" /opt/awarely
git clone <YOUR_REPO_URL> /opt/awarely
cd /opt/awarely
```

---

## 4. Create the environment file

```bash
cp .env.example .env
```

Generate the secrets. Either run this locally (Node 20+) and paste the output:

```bash
npm ci
npm run generate:secrets
```

…or generate them on the server without Node:

```bash
openssl rand -hex 32   # APP_SESSION_SECRET
openssl rand -hex 32   # CRON_SECRET
openssl rand -base64 18 # APP_PASSCODE
```

For VAPID keys without Node, run:

```bash
docker run --rm node:20-alpine npx --yes web-push generate-vapid-keys
```

Now edit `.env`:

```bash
nano .env
```

Required values:

| Variable | Where to get it |
| --- | --- |
| `SITE_ADDRESS` | `awarely.<YOUR_IP>.sslip.io` or your domain (direct mode) |
| `HTTP_PORT` | Host port for Caddy HTTP (default `80`) |
| `HTTPS_PORT` | Host port for Caddy HTTPS (default `443`) |
| `APP_PORT` | Loopback port for the app (default `3000`; change if occupied) |
| `APP_PASSCODE` | the passphrase you will type to unlock |
| `APP_SESSION_SECRET` | 64 hex chars |
| `CRON_SECRET` | 64 hex chars (different from above) |
| `SUPABASE_URL` | Supabase → Project Settings → API (project URL) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (service role secret) |
| `WEATHER_API_KEY` | WeatherAPI dashboard |
| `VAPID_PUBLIC_KEY` | `generate:secrets` output |
| `VAPID_PRIVATE_KEY` | `generate:secrets` output |
| `VAPID_SUBJECT` | `mailto:you@example.com` |

Lock the file down:

```bash
chmod 600 .env
```

---

## 5. Create the database

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql)
   and click **Run**.
3. Or automate it: put the direct Postgres URI (port `5432`, not the pooler)
   from **Project Settings → Database → Connection string** into `DATABASE_URL`
   in `.env`, then run `npm run db:migrate` (applies the newest migration).
   Pass a path to apply a specific file, e.g.
   `npm run db:migrate -- supabase/migrations/20261124000000_production_hardening.sql`.

This creates `activities`, `app_settings`, `notifications`, and
`push_subscriptions`, enables RLS with **no public policies**, and is safe to
re-run.

> On an existing Phase 2 database, run
> `supabase/migrations/20261124000000_production_hardening.sql` instead; it is
> additive and keeps existing activities.

---

## 6. Deploy

### Mode A — direct Caddy (ports 80/443 free)

```bash
cd /opt/awarely
docker compose up -d --build
```

Caddy starts, obtains a certificate for `SITE_ADDRESS`, and proxies to the app.
If ports are occupied, change `HTTP_PORT` / `HTTPS_PORT` in `.env` and use those
host ports in your firewall/DNS setup. Let's Encrypt HTTP-01 still requires
public port 80 unless you use DNS challenges.

### Mode B — existing reverse proxy (recommended on a shared VPS)

Use a free loopback port and start **only** the app and scheduler:

```bash
# .env: APP_PORT=3100 (or another free port)
cd /opt/awarely
docker compose up -d --build app scheduler
```

The app is reachable only at `127.0.0.1:3100` on the host. Point the existing
Nginx/Caddy/Coolify service at it. Example Nginx server block:

```nginx
server {
    listen 443 ssl http2;
    server_name awarely.example.com;

    ssl_certificate     /etc/letsencrypt/live/awarely.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/awarely.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

If the existing proxy is itself a container, attach the Awarely app to that
proxy’s Docker network and proxy to `app:3000` instead of `127.0.0.1:3100`.
Do not publish port 80/443 from this compose file in that mode.

### First boot

First boot takes a few minutes (npm install + Next.js build + certificate in
direct mode).

Check status:

```bash
docker compose ps
docker compose logs -f app
docker compose logs -f caddy       # direct mode only
docker compose logs -f scheduler
```

You want `app` to be `healthy` and, in direct mode, Caddy to log a successful
certificate issuance for your `SITE_ADDRESS`.

---

## 7. Verify

1. Open `https://<SITE_ADDRESS>`.
2. Enter your `APP_PASSCODE`.
3. Go to **Activities → Add Activity**. Create something outdoor, e.g.
   “Drying Clothes”, starting in a couple of hours, with a location.
4. Go to **Settings → Run alert check now**. Confirm it reports evaluated
   activities.
5. Open **Notifications** to see any generated alert.
6. In **Settings → Browser notifications**, click **Enable** and allow the
   browser prompt.
7. Click **Send test** and confirm the notification appears on your device.
8. Verify the health endpoint:

```bash
curl -fsS https://<SITE_ADDRESS>/api/health
# {"status":"ok","database":"connected",...}
```

The scheduler container calls the sync endpoint every 10 minutes, so alerts
and push notifications are produced even when the tab is closed.

---

## 8. Day-2 operations

### Update the app

```bash
cd /opt/awarely
git pull

# Direct mode:
docker compose up -d --build

# Shared-proxy mode:
docker compose up -d --build app scheduler
```

### Roll back a bad deploy

Deployments are image rebuilds from Git, so rollback is a checkout + rebuild.
Database migrations in this repo are additive, so a code rollback does not
require a destructive database rollback.

```bash
cd /opt/awarely
git log --oneline -5
git checkout <known-good-tag-or-commit>
docker compose up -d --build
# shared-proxy mode: docker compose up -d --build app scheduler
```

If a migration changed the schema in a way the old code cannot read, restore the
database from a backup instead (see below).

### View logs

```bash
docker compose logs -f app
docker compose logs -f scheduler
# direct mode:
docker compose logs -f caddy
```

Logs are rotated by Docker (`10 MB × 3` per service).

### Restart

```bash
docker compose restart app
```

### Clean-clone verification

Before trusting a release, verify from a fresh clone (on the VPS or a staging
host):

```bash
git clone <YOUR_REPO_URL> /tmp/awarely-verify
cd /tmp/awarely-verify
cp .env.example .env
# fill .env with staging values, then:
docker compose config >/dev/null
docker compose up -d --build
docker compose ps
curl -fsS http://127.0.0.1:3000/api/health
```

The same checks run in CI (`Docker build & Compose validation`).

### Change the passcode or rotate secrets

Edit `.env`, then:

```bash
docker compose up -d
```

Rotating `APP_SESSION_SECRET` invalidates every existing session (everyone must
re-enter the passcode). Rotating VAPID keys requires re-enabling push on each
device.

### Backups

Data lives in Supabase. Use Supabase’s built-in backups (paid plans) or schedule
`pg_dump` against the database connection string:

```bash
# Example, run from a trusted machine:
pg_dump "$DATABASE_URL" --format=custom --file="awarely-$(date +%F).dump"
```

The containers are stateless. Only Caddy’s certificates live in Docker volumes;
Caddy re-issues them automatically if those are lost.

### Restore

```bash
# Restore into a staging Supabase project first.
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" awarely-YYYY-MM-DD.dump
```

Verify the schema and a test activity before pointing production at the restored
database.

---

## 9. Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| Port 80/443 already in use | Direct mode conflict. Use shared-proxy mode with `APP_PORT`, or choose free `HTTP_PORT`/`HTTPS_PORT`. |
| Caddy serves 502 | `app` is not healthy. `docker compose logs app`; usually a missing/invalid env var. |
| Certificate not issued | Ports 80/443 blocked, or `SITE_ADDRESS` does not resolve to this server. Check `docker compose logs caddy`. |
| Existing proxy returns 502 | Proxy target is wrong. Verify `curl http://127.0.0.1:$APP_PORT/api/health` on the host. |
| “Server is not configured” on unlock | `APP_PASSCODE` or `APP_SESSION_SECRET` missing/too short. |
| Database errors / empty app | Schema not applied, or wrong `SUPABASE_SERVICE_ROLE_KEY`. Use Settings → System status / `/api/health`. |
| Push toggle disabled | VAPID keys missing, or the browser/site is not HTTPS. |
| No push received | Check `docker compose logs scheduler` and that notifications were created. Re-enable push on the device. |
| Weather always fallback | `WEATHER_API_KEY` invalid or quota exceeded. Check app logs. |

---

## 10. Security checklist

- [ ] `APP_PASSCODE` is long and not reused anywhere else.
- [ ] `.env` is `chmod 600` and never committed.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` only exists server-side (no `NEXT_PUBLIC_` prefix).
- [ ] Supabase RLS is enabled with no public policies.
- [ ] Firewall only exposes 22 and the proxy ports (80/443 direct mode; existing proxy ports in shared mode).
- [ ] `APP_PORT` is bound to `127.0.0.1` only, not `0.0.0.0`.
- [ ] `/api/health` is the only unauthenticated API route; it leaks no data.
- [ ] `APP_SESSION_SECRET` is rotated to revoke all sessions (changing only the passcode does not revoke existing cookies).
- [ ] Automated tests pass (`npm test` — currently 66 tests).
- [ ] The CSP header is present and the browser console has no CSP violations.
- [ ] Automatic security updates enabled (`unattended-upgrades`) on the VPS.
