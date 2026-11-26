# Deploying a Next.js App to a Shared VPS — Walkthrough

This is the **beginner-friendly** companion to
[`DEPLOYMENT_NATIVE.md`](DEPLOYMENT_NATIVE.md).

Where that file is a reference ("what the config is"), this file explains the
**order of operations and the reason for each step**, so you can repeat the
process by hand on a new project.

---

## The mental model

Treat the server like an office building:

| Building part | Real software | Job |
|---|---|---|
| Front door / receptionist | **Nginx** | Receives all public traffic and forwards it |
| Back office worker | **Node.js / Next.js** | Runs the actual app |
| Manager | **PM2** | Keeps the worker running, restarts it if it dies |
| Alarm clock | **cron** | Runs scheduled jobs (e.g. every 10 minutes) |
| External vendors | **Supabase, WeatherAPI** | Database and third-party APIs |
| Door guard | **Certbot / Let's Encrypt** | Provides HTTPS |

Traffic flows one way:

```
Internet ──443──> Nginx ──> 127.0.0.1:<PORT> (Next.js) ──> Supabase / APIs
```

The app is **never** exposed directly to the internet. Only Nginx is public.

---

## Step 1 — Inspect before touching anything

A shared VPS already runs someone else's apps. Find out what exists **before**
installing or restarting anything.

```bash
ssh root@<SERVER_IP>

cat /etc/os-release            # OS version
free -h                        # RAM
df -h /                        # disk space
ss -ltnp                       # ⚠️ which ports are already in use
pm2 list                       # apps PM2 already manages
ls /etc/nginx/sites-enabled     # websites already configured
```

**Why:** `ss -ltnp` is the single most important command. It tells you which
ports are free. If you skip it, you can take down an existing app.

In the Awarely deploy this revealed that **port 3000 was already taken**, so the
app was assigned **3120**.

---

## Step 2 — Pick a private port

A port is a numbered door on the machine. Web traffic uses 80/443; your app
needs its own door.

- Choose a free port, e.g. `3120`.
- Bind it to `127.0.0.1` (loopback) so only the server itself can connect.
- Nginx reaches it; the internet cannot.

Result in `.env`:

```env
PORT=3120
HOSTNAME=127.0.0.1
NODE_ENV=production
```

---

## Step 3 — Copy the code to the server

```bash
rsync -az \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude .env \
  --exclude .env.local \
  -e "ssh -i ~/.ssh/<KEY>" \
  ./ root@<SERVER_IP>:/opt/<app>/
```

Decisions and why:

- **`/opt/<app>`** — standard location for optional/third-party software; keeps
  the app away from system files and from other apps.
- **Exclude `node_modules` and `.next`** — they are rebuilt on the server and are
  large/platform-specific.
- **Exclude `.env`** — secrets are created by hand on the server, never copied.
- **`rsync` vs `git clone`** — `rsync` works before code is pushed and gives fast
  updates. `git clone` is cleaner if the repo is already on a remote (see the
  update section).

---

## Step 4 — Create the secret config file on the server

```bash
cd /opt/<app>
nano .env          # add production values
chmod 600 .env     # only the owner can read/write
```

`chmod 600` matters: other users or apps on the server cannot read the database
keys, VAPID private key, or cron secret.

**Rules:**
- `.env` is never committed (it is in `.gitignore`).
- `.env` is never copied by the deploy script.
- Rotate secrets if they ever leak; changing `AUTH_SECRET` logs everyone out.

---

## Step 5 — Install dependencies and build

```bash
npm ci
npm run build:standalone
```

- **`npm ci`** installs exact locked versions. Use it on servers; `npm install`
  can silently upgrade packages.
- **`build:standalone`** runs `next build` and then copies `public/` and
  `.next/static/` into `.next/standalone/`.

**Why the custom script:** Next.js's standalone output does not include
`public/` or static assets by itself. Without the copy step, CSS, images and the
service worker return 404.

---

## Step 6 — Run the app under PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

- **PM2** keeps the process alive and restarts it on crash or reboot.
- **`pm2 save`** persists the process list so it survives a server reboot.
- Run **one instance**: the login rate limiter and the sync lock are
  process-local, so multiple instances would let requests bypass them.

Useful commands:

```bash
pm2 status
pm2 logs <app> --lines 50
pm2 restart <app> --update-env    # after changing .env
```

`--update-env` is required when `.env` changes; a plain restart keeps the old
environment.

---

## Step 7 — Put Nginx in front

Create `/etc/nginx/sites-available/<app>`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name <your.domain>;

    client_max_body_size 2m;

    location / {
        proxy_pass http://127.0.0.1:3120;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Host $host;     # required
        proxy_set_header X-Forwarded-Proto $scheme;  # required

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
```

Enable it:

```bash
ln -s /etc/nginx/sites-available/<app> /etc/nginx/sites-enabled/<app>
nginx -t                  # ALWAYS test first
systemctl reload nginx
```

**Why `nginx -t` first:** one typo in a config can break **every** site on the
server. `nginx -t` validates safely; `reload` applies it without dropping
connections.

**Why the `X-Forwarded-*` headers:** without them the app thinks it is running
on `localhost:3120` and builds redirects/cookies for the wrong origin. The app
must also be written to trust these headers (see `middleware.ts` in this repo).

---

## Step 8 — Enable HTTPS

```bash
certbot --nginx -d <your.domain> \
  --non-interactive --agree-tos --redirect \
  -m you@example.com
```

Certbot will:

1. obtain a free Let's Encrypt certificate,
2. edit the Nginx block to listen on 443 and reference the cert,
3. add an HTTP → HTTPS redirect,
4. schedule automatic renewal.

Verify:

```bash
certbot certificates
```

HTTPS is also a hard requirement for browser push notifications and service
workers.

---

## Step 9 — Add the scheduler

Background work must run even when no browser is open. Use cron.

```bash
mkdir -p /var/log/<app>
crontab -e
```

```cron
*/10 * * * * /opt/<app>/scripts/run-sync.sh >> /var/log/<app>/sync.log 2>&1
```

The script should:

- read secrets from `.env`,
- call the internal sync endpoint on loopback,
- send an `x-cron-secret` header so random internet requests cannot trigger it,
- log success or failure.

Verify with:

```bash
tail -f /var/log/<app>/sync.log
```

---

## Step 10 — Prove each layer works

Do not declare success because a command did not error. Check every layer:

```bash
curl -I http://<your.domain>                  # expect 301 → HTTPS
curl https://<your.domain>/api/health         # expect status ok + db connected
pm2 status                                    # process online
nginx -t                                      # config valid
tail /var/log/<app>/sync.log                  # recent sync lines
certbot certificates                          # cert valid + renewal scheduled
```

Then open the site in a real browser and click through the main flows:
login, dashboard, list pages, settings. Watch the browser console and network
tab for errors.

---

## Updating a deployment

### Option A — rsync (works without git on the server)

```bash
rsync -az --exclude node_modules --exclude .next --exclude .git \
  --exclude .env --exclude .env.local \
  -e "ssh -i ~/.ssh/<KEY>" ./ root@<SERVER_IP>:/opt/<app>/

ssh root@<SERVER_IP> 'cd /opt/<app> \
  && npm ci \
  && npm run build:standalone \
  && pm2 restart <app> --update-env \
  && pm2 save'
```

### Option B — git on the server (preferred once set up)

```bash
# one time
cd /opt/<app>
git init
git remote add origin https://github.com/<you>/<repo>.git
git fetch origin
git checkout -f main

# every update
git pull
npm ci
npm run build:standalone
pm2 restart <app> --update-env
```

`.env` stays safe because it is git-ignored.

---

## Rollback

```bash
cd /opt/<app>
git log --oneline -5
git checkout <known-good-commit>
npm ci
npm run build:standalone
pm2 restart <app> --update-env
```

Database migrations should be additive. Only restore a backup if the old code
cannot run against the new schema.

---

## Real bugs from this deployment (and their lessons)

| Symptom | Actual cause | Lesson |
|---|---|---|
| Redirects to `localhost:3120` | App ignored Nginx's `X-Forwarded-Host`/`-Proto` | Forward the headers **and** trust them in the app |
| Login succeeded, APIs returned 401 | Edge middleware passed the wrong type to `crypto.subtle.verify` (`.buffer` vs `Uint8Array`) | Node and Edge runtimes differ — test auth through the proxy, not just locally |
| Browser push failed | Browser had notifications **blocked** for the origin; a stale `localhost` subscription remained | Permissions are per-origin; clear subscriptions when the origin or VAPID keys change |

---

## Copy-paste checklist

```
1.  ssh root@SERVER
2.  ss -ltnp                                  → find a free port
3.  free -h; df -h /; pm2 list; ls /etc/nginx/sites-enabled
4.  choose PORT=3xxx, bind 127.0.0.1
5.  copy code to /opt/<app>
6.  create /opt/<app>/.env by hand, chmod 600
7.  npm ci && npm run build:standalone
8.  pm2 start ecosystem.config.cjs && pm2 save
9.  write /etc/nginx/sites-available/<app> with proxy_pass + X-Forwarded-*
10. ln -s ...; nginx -t; systemctl reload nginx
11. certbot --nginx -d your.domain
12. add cron job + log file
13. verify health, login, TLS, cron log
```

---

## Hardening ideas for a dedicated server

- Run the app as a non-root user (`awarely`) with its own PM2 instance.
- Harden SSH: disable password login, use keys only.
- Enable `ufw` allowing only 22/80/443.
- Add log rotation for `pm2` and `/var/log/<app>`.
- Add uptime monitoring and a nightly database backup.
