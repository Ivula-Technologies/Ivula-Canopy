-- Remember which volunteers already got their shift reminder, so a cron job
-- that runs twice (a retry, a manual run) never emails anyone twice.
-- Safe to run more than once.

alter table shift_signups add column if not exists reminder_sent_at timestamptz;
