create table if not exists public.users (
  id text primary key,
  toss_user_key text unique not null,
  phone_number text,
  created_at timestamptz not null
);

create table if not exists public.notification_consents (
  user_id text primary key references public.users(id) on delete cascade,
  push_enabled boolean not null default false,
  push_consented_at timestamptz,
  sms_enabled boolean not null default false,
  sms_unsubscribed_at timestamptz,
  updated_at timestamptz not null
);

create table if not exists public.reminders (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  title text not null,
  allowed_start_hour integer not null check (allowed_start_hour >= 0 and allowed_start_hour <= 23),
  allowed_end_hour integer not null check (allowed_end_hour >= 1 and allowed_end_hour <= 24),
  intensity text not null check (intensity in ('gentle', 'normal', 'strong')),
  randomness integer not null default 50 check (randomness >= 0 and randomness <= 100),
  status text not null check (status in ('active', 'completed', 'disabled')),
  snoozed_until timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.reminder_events (
  id text primary key,
  reminder_id text not null references public.reminders(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  type text not null check (type in ('created', 'completed', 'snoozed', 'unsnoozed', 'sent', 'skipped')),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null
);

create table if not exists public.send_attempts (
  id text primary key,
  reminder_id text not null references public.reminders(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  channel text not null check (channel in ('push', 'sms')),
  status text not null check (status in ('sent', 'failed', 'skipped')),
  reason text,
  provider_message_id text,
  created_at timestamptz not null
);

alter table public.users enable row level security;
alter table public.notification_consents enable row level security;
alter table public.reminders enable row level security;
alter table public.reminder_events enable row level security;
alter table public.send_attempts enable row level security;

create policy "anon users all"
  on public.users for all
  to anon
  using (true)
  with check (true);

create policy "anon notification_consents all"
  on public.notification_consents for all
  to anon
  using (true)
  with check (true);

create policy "anon reminders all"
  on public.reminders for all
  to anon
  using (true)
  with check (true);

create policy "anon reminder_events all"
  on public.reminder_events for all
  to anon
  using (true)
  with check (true);

create policy "anon send_attempts all"
  on public.send_attempts for all
  to anon
  using (true)
  with check (true);

create index if not exists reminders_user_id_created_at_idx on public.reminders (user_id, created_at desc);
create index if not exists reminder_events_user_id_created_at_idx on public.reminder_events (user_id, created_at desc);
create index if not exists send_attempts_user_id_created_at_idx on public.send_attempts (user_id, created_at desc);
