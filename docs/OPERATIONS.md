# Running Canopy

This is the whole operations manual for one person. The rule behind it:
every piece is a managed service that runs, alerts and backs up on its own,
so nothing needs watching day to day.

## How it fits together

```
 Browser / phone app
        │  https://canopy.ivulatechnologies.com
        ▼
 cPanel "Setup Node.js App"  ── one Next.js server (pages + /api)
        │            │             │              │
        ▼            ▼             ▼              ▼
    Supabase      Stripe        Resend       cPanel cron (daily)
  database +    billing +      all email     /api/cron/shift-reminders
  sign-in       webhook ──►                  /api/cron/trial-reminders
                /api/stripe/webhook

 GitHub Actions: CI on every PR · "Build cPanel Package" · nightly encrypted backup
 UptimeRobot: checks /api/health every 5 minutes
```

## What protects what

| Risk | What Canopy does about it | Your part |
| --- | --- | --- |
| A payment applied twice, out of order, or lost | The Stripe webhook re-reads the subscription from Stripe every time, so repeats and late events are harmless. The return from Checkout saves the plan too. Stripe calls retry network blips with the same idempotency key, and a double click can't create two Stripe customers. | Nothing. Stripe retries failed webhooks for 3 days and emails you if they keep failing. |
| A script filling shifts with fake sign-ups or sending floods of email | Public sign-ups, "cancel my spot" and volunteer messages are limited per internet address and per link. The counts live in the database (SQL 015), so a restart or a second server process doesn't reset them. If the database can't be reached the limits fall back to memory, so real volunteers are never blocked by the limiter itself. | Nothing. |
| An error nobody sees | Every server error is logged as one JSON line (cPanel keeps it in the app's `stderr.log`) and emailed to `ALERT_EMAIL`. The same error is emailed at most once an hour, 20 alerts a day at most. | Set `ALERT_EMAIL` once. |
| The site down, a setting missing, SQL not run, reminders stopped | `/api/health` answers 503 and says which: `missing` settings, `database`, `sqlNotRun`, or a daily job that is `late` (no run for 26 hours) or `failing`. `build` shows which commit is live. | Point UptimeRobot at it once. |
| Losing data | Every night GitHub saves an encrypted copy of the whole database for 30 days. | Add two GitHub secrets once. |
| Browser attacks (clickjacking, content sniffing) | Security headers on every page. | Nothing. |

## One-time setup (about 20 minutes)

1. **SQL.** In Supabase > SQL editor, run any of `supabase/migrations/010` to `015` that the live database doesn't have, in order. After 015, `/api/health` lists anything still missing under `sqlNotRun`.
2. **Alerts.** cPanel > Setup Node.js App > Canopy > add `ALERT_EMAIL` = the inbox you read. Restart.
3. **Backups.** GitHub > Ivula-Canopy > Settings > Secrets and variables > Actions > New repository secret:
   - `SUPABASE_DB_URL`: Supabase > Connect > **Session pooler** connection string, with the database password filled in. (The "Direct connection" string doesn't work from GitHub.)
   - `BACKUP_PASSPHRASE`: a long random phrase. Save it in your password manager; without it the backups can't be opened.

   Then Actions > **Back up database** > Run workflow, to check it goes green.
4. **Uptime.** UptimeRobot (free) > New monitor > HTTP(s) > `https://canopy.ivulatechnologies.com/api/health`, every 5 minutes, alerts to your email and the UptimeRobot phone app.

## When something goes wrong

**UptimeRobot says Canopy is down.** Open `/api/health` and read it:
- `missing`: add those settings in cPanel > Setup Node.js App, then Restart.
- `database: "error"`: check status.supabase.com, and whether the Supabase project is paused (free projects pause after a week with no activity; Restore project).
- `sqlNotRun`: run those files in the Supabase SQL editor, in order.
- `jobs` says `late`: the cPanel cron line is gone or wrong. cPanel > Cron Jobs should have both daily lines.
- `jobs` says `failing`: the alert email has the error.
- The page doesn't load at all: cPanel > Setup Node.js App > Restart. If it still fails, read `stderr.log` in the app folder.

**A church paid but Canopy still shows the old plan.** Stripe > Developers > Webhooks > the Canopy endpoint > find the failed event > Resend. Canopy re-reads the subscription, so resending any event for that church fixes it.

**A new upload broke something.** Upload the previous package zip again (keep the last good zip on your computer; GitHub only keeps package downloads for 7 days), Extract over, Restart. SQL files only ever add things, so older code runs fine on the newer database.

## Backups and restoring

Nightly backups are under GitHub > Actions > **Back up database** > a run > Artifacts. Each holds `roles.sql`, `schema.sql` and `data.sql`, including sign-in accounts.

To restore (to a new Supabase project, or to the same one if it was wiped):

```bash
gpg --decrypt canopy-db-YYYY-MM-DD.tar.gz.gpg > backup.tar.gz   # asks for BACKUP_PASSPHRASE
mkdir backup && tar -xzf backup.tar.gz -C backup && cd backup
psql "$NEW_SESSION_POOLER_URL" --single-transaction --variable ON_ERROR_STOP=1 \
  --file roles.sql --file schema.sql \
  --command 'SET session_replication_role = replica' --file data.sql
```

If it went to a new project, update `NEXT_PUBLIC_SUPABASE_URL`, the publishable key and `SUPABASE_SERVICE_ROLE_KEY` in cPanel, set Supabase > Authentication > URL Configuration (Site URL and redirect URLs) as before, and Restart. Try a restore into a throwaway project once, so the first real one isn't the first time.

Supabase Pro ($25 a month) adds its own daily backups and never pauses the project. Worth switching on with the first paying church.

## Staging (optional, no extra server)

Vercel already builds a preview of every branch. To try a change before uploading it to cPanel, give Vercel's **Preview** environment its own free Supabase project (run all the SQL files on it) and Stripe **test** keys. Preview builds must never use the live Supabase keys, or clicking around a test build changes real churches' data. Production stays on cPanel.

## When to change this setup

This holds comfortably to a few hundred churches. Change something only when a limit actually shows up:

| Sign | Change |
| --- | --- |
| Resend says you've hit the daily limit (the free plan sends 100 a day; shift reminders add up) | Resend Pro, $20 a month |
| Supabase warns about database size or CPU | Supabase Pro, then a larger compute size |
| cPanel shows the app at its memory or process limit | A bigger hosting plan |

Left out on purpose, because each one is another thing to look after: queues, Redis, separate services, containers, multiple regions.
