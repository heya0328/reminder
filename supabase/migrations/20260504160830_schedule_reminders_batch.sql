-- Enables pg_cron + pg_net + vault, then schedules the reminders-batch edge function hourly.
-- The BATCH_SECRET must be stored in Vault before applying this migration:
--   select vault.create_secret('<the secret value>', 'batch_secret');
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

-- Idempotent unschedule of any previous job with the same name
do $$
begin
  if exists (select 1 from cron.job where jobname = 'reminders-batch-hourly') then
    perform cron.unschedule('reminders-batch-hourly');
  end if;
end $$;

select cron.schedule(
  'reminders-batch-hourly',
  '0 * * * *',
  $cron$
    select net.http_post(
      url := 'https://wsoyaciuchnrzdhthtlr.supabase.co/functions/v1/reminders-batch',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'x-batch-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'batch_secret' limit 1)
      ),
      body := '{}'::jsonb
    );
  $cron$
);
