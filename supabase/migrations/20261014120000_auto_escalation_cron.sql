-- Prerequisites: Enable pg_cron and pg_net extensions via Supabase Dashboard → Database → Extensions.
-- Replace <SERVICE_ROLE_KEY> with your actual service role key when deploying.
select cron.schedule(
  'auto-escalate-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url    := 'https://mmnpopwzfjyfasvzzatg.supabase.co/functions/v1/escalations',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body   := '{"action":"tick"}'::jsonb
  ) as request_id;
  $$
);
