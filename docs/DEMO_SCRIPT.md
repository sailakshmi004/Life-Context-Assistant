# Awarely — 5-Minute Demo Script

Use this for a portfolio walkthrough, interview, or README video.

## 0. Before the demo

```bash
npm run dev
```

Open <http://localhost:3000> and keep the passcode ready (`APP_PASSCODE`).

Recommended sample activity:

| Field | Value |
|---|---|
| Title | Drying Clothes |
| Category | Household |
| Start | A rainy hour from today's forecast |
| End | Start + 60–120 minutes |
| Location | Your city |
| Monitoring | On |

To find a rainy hour quickly, open **Weather**, search your city, and look for
hours with a rain icon or ≥50% precipitation.

---

## 1. The problem (20 seconds)

> Normal reminders fire at a fixed time. Awarely checks the forecast for the
> activity's **actual time window** and warns you before the task starts.

Example: “Drying Clothes at 2 PM for 2 hours” → if rain is likely from 2–4 PM,
Awarely suggests moving it indoors.

---

## 2. Unlock (10 seconds)

- Open the app.
- Enter the passcode.
- Mention: every page and API route is protected by a signed HttpOnly cookie.

---

## 3. Dashboard tour (45 seconds)

Point out:

- Live WeatherAPI conditions.
- **Attention Needed** — current conflicts.
- **Today's Activities** — Today/All toggle.
- **Upcoming Reminders** — starting within 60 minutes.
- Service status (database, weather, alerts).

---

## 4. Create an activity (45 seconds)

- Click **Add Activity**.
- Enter “Drying Clothes”.
- Choose **Household**.
- Set start/end time.
- Show the **Weather checks** badges appear: Rain, Wind, Humidity.
- Save.

Talking point: rules are selected per activity type, not hardcoded to one task.

---

## 5. Generate an alert (45 seconds)

- Go to **Settings → Run alert check now**.
- Point out the summary: evaluated activities, new alerts, resolved conflicts,
  forecast changes, push count.
- Go to **Notifications**.
- Open the weather alert and show the reason + suggestion.

---

## 6. Activity detail (30 seconds)

- Return to **Activities**.
- Click the eye icon on “Drying Clothes”.
- Show schedule, end time, location, weather checks, and notification history.

---

## 7. Push notification (30 seconds)

- Settings → Browser notifications → **Enable**.
- Click **Send test**.
- Show the notification arriving.
- Mention: the scheduler container runs sync every 10 minutes even when the
  tab is closed.

---

## 8. Weather + settings (30 seconds)

- Weather page: search another city, or use **My location**.
- Settings: default location, alert generation toggle, push, system status,
  last alert check, lock app.

---

## 9. Security (20 seconds)

- Single-user passcode gate (no public sign-up).
- Supabase RLS locked down; service-role key server-only.
- Content-Security-Policy and security headers.
- Scheduler uses a separate cron secret.
- Public API errors are sanitized.

---

## 10. Architecture / interview talking points (45 seconds)

- **Next.js App Router + TypeScript strict** for UI + route handlers.
- **Supabase PostgreSQL** with RLS; server-only service role.
- **Rules registry**: independent rain/heat/wind/humidity evaluators.
- **Timezone-safe overlap**: WeatherAPI `time_epoch` (UTC) is authoritative.
- **Idempotent notifications**: stable dedupe keys; forecast changes update,
  stale alerts resolve.
- **SingleFlight lock** prevents overlapping scheduler/dashboard syncs.
- **Docker Compose**: app + Caddy + scheduler; loopback-only app port for
  shared-proxy deployments.
- **Testing**: 66 unit tests covering rules, transitions, auth, rate limits,
  timezone, and concurrency.

---

## 11. If something fails during the demo

| Problem | Quick check |
|---|---|
| Weather fallback | WeatherAPI key/quota; real forecast needs a valid key |
| No alert | Activity must be monitored and overlap a rainy hour |
| No push | HTTPS/localhost + permission + VAPID keys |
| Database error | Supabase credentials/schema |
| Scheduler not running | `docker compose ps` / scheduler logs |

Clean up demo data afterwards: delete the sample activity and dismiss its
notifications.
