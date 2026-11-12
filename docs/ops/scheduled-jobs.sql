-- Scheduled jobs on Supabase (pg_cron + pg_net), run on time every hour.
--
-- Why: GitHub runs scheduled workflows when it has room, not on the hour. On
-- 2026-11-11/12 the "hourly" reminders workflow ran about every 8 hours
-- (01:44, 08:58, 16:57, 02:44, 10:44 UTC). The backend sends a learner's
-- reminder only up to two hours late, so most reminder hours were never sent,
-- and background subtopic tagging got about 3 runs a day instead of 18.
-- Supabase's own scheduler already wakes the backend every 10 minutes
-- (job "keep-backend-awake") and runs on time; these two jobs sit beside it.
-- The GitHub workflow stays as a backup: both endpoints are safe to call
-- twice (a learner's reminder is claimed once a day; one tagging run at a time).
--
-- HOW TO RUN (once), in Supabase › SQL editor:
--   1. Replace PASTE_CRON_SECRET_HERE below with the CRON_SECRET value from
--      Render › ree-tracker-backend › Environment (the same one GitHub has).
--   2. Run the whole script.
--   3. Check: select jobname, schedule, active from cron.job;
--      After the next hour: select status, return_message, start_time
--        from cron.job_run_details order by start_time desc limit 5;
--      and select status_code, created from net._http_response order by created desc limit 5;
--      (200 for reminders, 202 for tagging).
-- The secret goes into Supabase Vault, encrypted; the jobs read it from there,
-- so it never appears in the job's text. Don't commit this file with the
-- secret filled in.
--
-- To undo: select cron.unschedule('send-reminders'); select cron.unschedule('subtopic-tags');
--          delete from vault.secrets where name = 'cron_secret';

-- The secret, once (a second run fails on the name: delete it first, as above).
select vault.create_secret('PASTE_CRON_SECRET_HERE', 'cron_secret', 'x-cron-secret for POST /api/cron/* on the backend');

-- Reminders: minute 5 of every hour. The backend sends each learner's at their
-- hour (04:00-23:00 Manila) and does nothing at other hours.
select cron.schedule(
  'send-reminders',
  '5 * * * *',
  $$
  select net.http_post(
    url := 'https://ree-tracker-backend.onrender.com/api/cron/reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 120000
  );
  $$
);

-- Subtopic tagging in the background: minute 15, 06:00-23:00 Manila (22:00-15:00
-- UTC). Does nothing unless Admin › Question bank › Subtopics › In the
-- background is on. Answers 202 at once and works after.
select cron.schedule(
  'subtopic-tags',
  '15 0-15,22,23 * * *',
  $$
  select net.http_post(
    url := 'https://ree-tracker-backend.onrender.com/api/cron/subtopic-tags',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 60000
  );
  $$
);
