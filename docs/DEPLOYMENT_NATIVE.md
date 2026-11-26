# Awarely — Native VPS Deployment (Nginx + PM2)

This guide runs Awarely directly on the VPS with **Node.js 20 + PM2 + Nginx**.
No Docker is required.

```
Internet ──443──> Nginx (TLS) ──> 127.0.0.1:3000 (PM2 / Next.js standalone)
                                      │
                                      ├─ Supabase (hosted Postgres)
                                      ├─ WeatherAPI (hosted)
                                      └─ cron every 10 min → /api/notifications/sync
```

The app stays on loopback; only Nginx is public.

---

## 0. What you need

- Ubuntu 22.04/24.04 VPS with a public IPv4
- SSH access as a non-root deploy user (recommended) with sudo
- A domain **or** an `sslip.io` hostname
- Supabase URL + service-role key
- WeatherAPI key
- Ports **80/443** available on the host

> Browser push requires HTTPS. Nginx + Certbot provides it.

---

## 1. Connect and prepare the server

```bash
ssh -i ~/.ssh/awarely_hostinger <USER>@<SERVER_IP>
```

Check the host:

```bash
lsb_release -a
free -h
sudo ss -ltnp | grep -E ':80|:443|:3000'
```

If 80/443 are already used by another Nginx site, that is fine — you can add a
new server block. If another process owns them, do not stop it without approval.

### Add swap if RAM is 1 GB or less

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 2. Install Node.js 20, PM2, Nginx, Certbot

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx

node -v          # v20.x
npm -v
sudo npm install -g pm2
pm2 -v
```

Enable Nginx at boot:

```bash
sudo systemctl enable --now nginx
```

---

## 3. Clone the app

```bash
sudo mkdir -p /opt/awarely
sudo chown "$USER":"$USER" /opt/awarely

git clone https://github.com/sailakshmi004/Life-Context-Assistant.git /opt/awarely
cd /opt/awarely
```

---

## 4. Create the production environment

```bash
cp .env.example .env
nano .env
chmod 600 .env
```

Fill:

```env
APP_PASSCODE=<new long passphrase>
APP_SESSION_SECRET=<openssl rand -hex 32>
CRON_SECRET=<openssl rand -hex 32, different>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
WEATHER_API_KEY=<key>
VAPID_PUBLIC_KEY=<generated>
VAPID_PRIVATE_KEY=<generated>
VAPID_SUBJECT=mailto:you@example.com
```

`SITE_ADDRESS`, `HTTP_PORT`, `HTTPS_PORT`, and `APP_PORT` are Docker/Caddy
settings. In native mode, Nginx and PM2 own the ports, so you can ignore them.

Add/confirm:

```env
# Native PM2
PORT=3000
HOSTNAME=127.0.0.1
```

If port 3000 is already used on the server, choose a free loopback port such as
`PORT=3120`, and set the same port in `proxy_pass` in the Nginx site config.

Keep `DATABASE_URL` empty unless you plan to run migrations from the server.

---

## 5. Install dependencies and build

```bash
cd /opt/awarely
npm ci
npm run build:standalone
```

`build:standalone` runs `next build` and copies `public/` plus `.next/static`
into `.next/standalone/`.

Verify the output exists:

```bash
ls .next/standalone/server.js
```

---

## 6. Start the app with PM2

The repository includes `ecosystem.config.cjs`.

```bash
cd /opt/awarely
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs awarely --lines 50
```

Test locally on the server:

```bash
curl -fsS http://127.0.0.1:3000/api/health
# {"status":"ok","database":"connected",...}
```

On a shared VPS, use the `PORT` you chose in `.env` (for example `3120`):

```bash
curl -fsS http://127.0.0.1:3120/api/health
```

Save the process list and enable boot startup:

```bash
pm2 save
pm2 startup systemd -u "$USER" --hp "$HOME"
```

PM2 prints a `sudo env PATH=... pm2 startup ...` command. Run exactly that
printed command, then:

```bash
pm2 save
```

> Keep **one instance**. The login rate limiter and notification sync lock are
> process-local; PM2 cluster mode would weaken them.

---

## 7. Configure Nginx

Copy the example config:

```bash
sudo cp deploy/nginx/awarely.conf /etc/nginx/sites-available/awarely
sudo nano /etc/nginx/sites-available/awarely
```

Change:

```nginx
server_name awarely.example.com;
```

Use your domain or:

```nginx
server_name awarely.<SERVER_PUBLIC_IP>.sslip.io;
```

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/awarely /etc/nginx/sites-enabled/awarely
sudo nginx -t
sudo systemctl reload nginx
```

### HTTPS with Certbot

```bash
sudo certbot --nginx -d awarely.example.com
```

or:

```bash
sudo certbot --nginx -d awarely.<SERVER_PUBLIC_IP>.sslip.io
```

Certbot modifies the server block for 443 and adds the HTTP → HTTPS redirect.
Renewal is automatic; verify with:

```bash
sudo certbot renew --dry-run
```

### Moving to a custom domain

The `sslip.io` hostname is only a placeholder. To attach a real domain that you
own:

1. **At your registrar**, point the name at this server:

   ```
   A    @      <SERVER_PUBLIC_IP>
   A    www    <SERVER_PUBLIC_IP>
   ```

2. **Confirm DNS** before touching Nginx:

   ```bash
   dig +short awarely.example.com     # must print <SERVER_PUBLIC_IP>
   ```

3. **Run the helper** on the server:

   ```bash
   sudo DOMAIN=awarely.example.com /opt/awarely/scripts/enable-domain.sh
   ```

   It will:

   - refuse to run unless DNS already resolves to this machine,
   - back up the Nginx site file,
   - add the domain (and `www` when it resolves) to every `server_name`,
   - run `nginx -t` and restore the backup if validation fails,
   - issue/renew the certificate with Certbot and force HTTPS,
   - check `https://<domain>/api/health`.

   Skip the certificate step with `SKIP_CERT=1` if you only want the Nginx change.

4. **Re-enable browser push.** Push subscriptions are bound to the origin, so
   open the new domain → Settings → **Enable** → **Send test**.

The old `sslip.io` hostname keeps working in the same server block. To make it
redirect to the new domain instead, replace the extra `server_name` entry with a
dedicated redirect block:

```nginx
server {
    listen 443 ssl;
    server_name awarely.<SERVER_PUBLIC_IP>.sslip.io;
    # reuse the same certificate lines Certbot wrote
    return 301 https://awarely.example.com$request_uri;
}
```

No application code changes are required: the app derives its public URL from
the request plus Nginx's `X-Forwarded-*` headers.

### Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Also ensure Hostinger’s firewall allows 80/443.

---

## 8. Schedule the notification sync

The app must be checked every 10 minutes, even when no browser is open.

```bash
sudo mkdir -p /var/log/awarely
sudo chown "$USER":"$USER" /var/log/awarely

crontab -e
```

Add:

```cron
*/10 * * * * /opt/awarely/scripts/run-sync.sh >> /var/log/awarely/sync.log 2>&1
```

Test the script manually:

```bash
/opt/awarely/scripts/run-sync.sh
tail -n 5 /var/log/awarely/sync.log
```

If the script fails, check that `CRON_SECRET` exists in `/opt/awarely/.env` and
that the app is reachable on the `PORT` in `.env` (default `3000`). The script
reads `PORT` automatically.

Optional log rotation:

```bash
sudo tee /etc/logrotate.d/awarely >/dev/null <<'EOF'
/var/log/awarely/*.log {
    weekly
    rotate 4
    missingok
    notifempty
    compress
}
EOF
```

---

## 9. Verify the deployment

1. Open `https://<SITE_ADDRESS>`.
2. Enter `APP_PASSCODE`.
3. Add an activity (e.g. “Drying Clothes”).
4. Settings → **Run alert check now**.
5. Check **Notifications**.
6. Enable browser push → **Send test**.
7. Confirm the cron sync log:
   ```bash
   tail -f /var/log/awarely/sync.log
   ```

---

## 10. Updates

```bash
cd /opt/awarely
git pull
npm ci
npm run build:standalone
pm2 restart awarely --update-env
```

Check:

```bash
pm2 status
pm2 logs awarely --lines 50
curl -fsS http://127.0.0.1:3000/api/health
```

### Rollback

```bash
cd /opt/awarely
git log --oneline -5
git checkout <known-good-commit>
npm ci
npm run build:standalone
pm2 restart awarely --update-env
```

Database migrations are additive; restore a Supabase backup only if a migration
is incompatible with the old code.

---

## 11. Logs and monitoring

```bash
pm2 status
pm2 logs awarely
pm2 monit
tail -f /var/log/awarely/sync.log
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

Optional PM2 log rotation:

```bash
pm2 install pm2-logrotate
```

Health check:

```bash
curl -fsS https://<SITE_ADDRESS>/api/health
```

---

## 12. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Nginx 502 | App not running or wrong port. `pm2 status`; `curl http://127.0.0.1:3000/api/health` |
| Port 3000 already in use | Change `PORT` in `ecosystem.config.cjs` and `proxy_pass` in Nginx |
| Certificate not issued | DNS/`sslip.io` must resolve to the VPS; ports 80/443 open |
| “Server is not configured” | `APP_PASSCODE` / `APP_SESSION_SECRET` missing; restart PM2 |
| Database unavailable | Check Supabase URL/service key; run schema/migrations |
| Weather always fallback | Invalid/quota-limited `WEATHER_API_KEY` |
| No notifications | Check cron, `/var/log/awarely/sync.log`, and the scheduler secret |
| Push not working | HTTPS, browser permission, VAPID keys |
| PM2 not running after reboot | `pm2 startup` command was not run, or `pm2 save` missing |

---

## 13. Security checklist

- [ ] App runs as a non-root deploy user
- [ ] `.env` is `chmod 600` and never committed
- [ ] PM2 listens on `127.0.0.1:3000`, not `0.0.0.0`
- [ ] Nginx is the only public entry point
- [ ] HTTPS is active; HTTP redirects to HTTPS
- [ ] Firewall exposes only 22, 80, 443
- [ ] `APP_SESSION_SECRET` rotated to revoke sessions
- [ ] Supabase RLS enabled with no public policies
- [ ] `npm test`, lint, type-check, and build pass before deploying
- [ ] Cron sync log is monitored and rotated

---

## 14. Native vs Docker

| | Native (this guide) | Docker |
|---|---|---|
| Runtime | Node 20 + PM2 | Node 20 container |
| TLS | Host Nginx + Certbot | Caddy container |
| Scheduler | Host cron | Scheduler container |
| Overhead | Lower | Higher |
| Reproducibility | Depends on host | High |
| Setup effort | More manual | One command |

Both use the same Supabase project and WeatherAPI key. You can switch later
without changing application code.
