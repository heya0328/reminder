-- 컬럼 추가
alter table public.notification_consents
  add column if not exists push_consented_at timestamptz;

-- 기본값 변경 (이후 신규 row만 영향)
alter table public.notification_consents
  alter column push_enabled set default false;
