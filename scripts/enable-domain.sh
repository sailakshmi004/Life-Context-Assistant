#!/usr/bin/env bash
# Attach a custom domain to the Awarely Nginx site and issue a TLS certificate.
#
# Run this ON THE SERVER as root, after the domain's DNS A record already points
# at this machine:
#
#   sudo DOMAIN=awarely.in /opt/awarely/scripts/enable-domain.sh
#   # or
#   sudo /opt/awarely/scripts/enable-domain.sh awarely.in
#
# It is safe to re-run: existing server_name entries are kept, and nginx is
# restored from a backup if the new config fails validation.
#
# Options (env vars):
#   DOMAIN      domain to add (required, or pass as $1)
#   APP_NAME    nginx site file name            (default: awarely)
#   PORT        app port used for the health check (default: 3120)
#   EMAIL       Let's Encrypt contact email     (default: certbot's account)
#   SKIP_CERT=1 add the domain to nginx only, skip certbot
set -euo pipefail

DOMAIN="${1:-${DOMAIN:-}}"
APP_NAME="${APP_NAME:-awarely}"
PORT="${PORT:-3120}"
SKIP_CERT="${SKIP_CERT:-0}"

SITE_FILE="/etc/nginx/sites-available/$APP_NAME"
ENABLED_LINK="/etc/nginx/sites-enabled/$APP_NAME"

die() { echo "ERROR: $*" >&2; exit 1; }
info() { echo "==> $*"; }

# --- validate input -----------------------------------------------------------
[ -n "$DOMAIN" ] || die "No domain given. Usage: $0 <domain>  (or DOMAIN=... $0)"
case "$DOMAIN" in
  *.*) ;;
  *) die "'$DOMAIN' does not look like a domain" ;;
esac
echo "$DOMAIN" | grep -qE '^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$' \
  || die "'$DOMAIN' is not a valid hostname"

[ "$(id -u)" -eq 0 ] || die "Run as root (sudo)"
[ -f "$SITE_FILE" ] || die "Missing $SITE_FILE (is the app deployed?)"
command -v nginx >/dev/null || die "nginx not installed"
command -v dig >/dev/null || die "dig not installed (apt install dnsutils)"

# --- verify DNS already points here ------------------------------------------
info "Checking DNS for $DOMAIN"
SERVER_IP="$(curl -fsS --max-time 10 https://api.ipify.org 2>/dev/null || true)"
[ -n "$SERVER_IP" ] || die "Could not determine this server's public IP"

RESOLVED="$(dig +short A "$DOMAIN" | tail -n 1)"
[ -n "$RESOLVED" ] || die "$DOMAIN does not resolve yet. Add the A record and wait."
if [ "$RESOLVED" != "$SERVER_IP" ]; then
  die "$DOMAIN resolves to $RESOLVED, but this server is $SERVER_IP.
     Fix the DNS A record first, then re-run."
fi
info "DNS OK: $DOMAIN -> $RESOLVED"

# www is optional; only include it if it also points here.
INCLUDE_WWW=0
if [ "$(dig +short A "www.$DOMAIN" | tail -n 1)" = "$SERVER_IP" ]; then
  INCLUDE_WWW=1
  info "DNS OK: www.$DOMAIN -> $SERVER_IP"
fi

# --- update server_name -------------------------------------------------------
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$SITE_FILE.bak.$STAMP"
cp -a "$SITE_FILE" "$BACKUP"
info "Backup written: $BACKUP"

NAMES="$DOMAIN"
[ "$INCLUDE_WWW" -eq 1 ] && NAMES="$DOMAIN www.$DOMAIN"

awk -v names="$NAMES" -v apex="$DOMAIN" '
  /^[[:space:]]*server_name[[:space:]]/ && index($0, apex) == 0 {
    sub(/;[[:space:]]*$/, "")
    $0 = $0 " " names ";"
  }
  { print }
' "$BACKUP" > "$SITE_FILE"

if ! nginx -t; then
  cp -a "$BACKUP" "$SITE_FILE"
  die "nginx -t failed; config restored. Nothing was reloaded."
fi

# Ensure the site is enabled (fresh installs).
if [ ! -e "$ENABLED_LINK" ]; then
  ln -s "$SITE_FILE" "$ENABLED_LINK"
  info "Enabled site: $ENABLED_LINK"
fi

systemctl reload nginx
info "nginx reloaded"

# --- certificate --------------------------------------------------------------
if [ "$SKIP_CERT" = "1" ]; then
  info "SKIP_CERT=1, skipping certbot"
else
  CERT_ARGS=(-d "$DOMAIN")
  [ "$INCLUDE_WWW" -eq 1 ] && CERT_ARGS+=(-d "www.$DOMAIN")

  info "Requesting certificate for: ${CERT_ARGS[*]}"
  if [ -n "${EMAIL:-}" ]; then
    certbot --nginx "${CERT_ARGS[@]}" --expand --redirect \
      --non-interactive --agree-tos -m "$EMAIL"
  else
    # Reuse the existing Let's Encrypt account when one is already registered.
    certbot --nginx "${CERT_ARGS[@]}" --expand --redirect \
      --non-interactive --agree-tos --register-unsafely-without-email
  fi
fi

# --- verify -------------------------------------------------------------------
info "Verifying https://$DOMAIN/api/health"
if curl -fsS --max-time 20 --retry 3 --retry-delay 3 "https://$DOMAIN/api/health"; then
  echo
else
  echo "Health check failed. Check: pm2 logs $APP_NAME --lines 50" >&2
  exit 1
fi

if curl -fsS --max-time 10 -o /dev/null -w '%{http_code}\n' "http://$DOMAIN" | grep -q 301; then
  info "HTTP redirects to HTTPS"
else
  echo "WARN: http://$DOMAIN did not return 301" >&2
fi

cat <<EOF

Done. $DOMAIN now serves the app on port $PORT.

Next steps:
  1. Open https://$DOMAIN and confirm the UI loads.
  2. Browser push is per-origin: open Settings -> Enable on the new domain.
  3. Optional: make the old URL redirect here instead of serving directly.
  4. Optional: update VAPID_SUBJECT in /opt/$APP_NAME/.env to
     mailto:you@$DOMAIN and run: pm2 restart $APP_NAME --update-env

Rollback: cp -a $BACKUP $SITE_FILE && nginx -t && systemctl reload nginx
EOF
