#!/usr/bin/env node
/**
 * Prints the secrets Awarely needs. Run with `npm run generate:secrets`.
 * Nothing is written to disk — copy the values into your .env file.
 */
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const webpush = require("web-push");

const sessionSecret = randomBytes(32).toString("hex");
const cronSecret = randomBytes(32).toString("hex");
const passcode = randomBytes(12).toString("base64url");
const vapid = webpush.generateVAPIDKeys();

console.log(`
# ---- Copy these into .env (never commit them) ----

# Unlock screen passphrase (change if you want something memorable)
APP_PASSCODE=${passcode}

# Session cookie signing key
APP_SESSION_SECRET=${sessionSecret}

# Scheduler <-> app shared secret
CRON_SECRET=${cronSecret}

# Web Push VAPID keys
VAPID_PUBLIC_KEY=${vapid.publicKey}
VAPID_PRIVATE_KEY=${vapid.privateKey}
VAPID_SUBJECT=mailto:you@example.com

# Tip: for HTTPS without a domain, set SITE_ADDRESS to
#   awarely.<YOUR_SERVER_PUBLIC_IP>.sslip.io
`);
