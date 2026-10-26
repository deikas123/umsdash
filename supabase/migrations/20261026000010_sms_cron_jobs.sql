-- FEAT-001: Fix sms_logs schema gaps and register 4 pg_cron scheduled SMS jobs.
-- Prerequisites: pg_cron and pg_net extensions must be enabled via Supabase Dashboard → Database → Extensions.
-- Replace <SERVICE_ROLE_KEY> with your actual service role key when deploying.

-- Step 1: Fix sms_logs schema
ALTER TABLE public.sms_logs ALTER COLUMN sent_by DROP NOT NULL;

ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS related_table text;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS related_id uuid;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS sms_response jsonb;

-- Step 2: Extend sms_preferences
ALTER TABLE public.sms_preferences ADD COLUMN IF NOT EXISTS notify_hr_events boolean NOT NULL DEFAULT true;
ALTER TABLE public.sms_preferences ADD COLUMN IF NOT EXISTS notify_announcements boolean NOT NULL DEFAULT true;

-- Step 3: Ensure extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Step 4: Register pg_cron scheduled jobs (unschedule first for idempotency)

-- 4a: Daily password reminders at 04:00 UTC
select cron.unschedule('sms-password-reminders');
select cron.schedule(
  'sms-password-reminders',
  '0 4 * * *',
  $$
  select net.http_post(
    url    := 'https://mmnpopwzfjyfasvzzatg.supabase.co/functions/v1/sms-password-reminders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body   := '{"action":"tick"}'::jsonb
  ) as request_id;
  $$
);

-- 4b: Weekly digest every Monday at 03:00 UTC
select cron.unschedule('sms-weekly-digest');
select cron.schedule(
  'sms-weekly-digest',
  '0 3 * * 1',
  $$
  select net.http_post(
    url    := 'https://mmnpopwzfjyfasvzzatg.supabase.co/functions/v1/weekly-digest',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body   := '{"action":"tick"}'::jsonb
  ) as request_id;
  $$
);

-- 4c: Daily expiring docs check at 05:00 UTC
select cron.unschedule('sms-expiring-docs');
select cron.schedule(
  'sms-expiring-docs',
  '0 5 * * *',
  $$
  select net.http_post(
    url    := 'https://mmnpopwzfjyfasvzzatg.supabase.co/functions/v1/hr-check-expiring-docs',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body   := '{"action":"tick"}'::jsonb
  ) as request_id;
  $$
);

-- 4d: Daily pulse reminders at 06:00 UTC
select cron.unschedule('sms-pulse-reminders');
select cron.schedule(
  'sms-pulse-reminders',
  '0 6 * * *',
  $$
  select net.http_post(
    url    := 'https://mmnpopwzfjyfasvzzatg.supabase.co/functions/v1/hr-send-pulse-reminders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body   := '{"action":"tick"}'::jsonb
  ) as request_id;
  $$
);
