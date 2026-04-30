-- 컬럼 추가
alter table public.notification_consents
  add column if not exists push_consented_at timestamptz;

-- 기본값 변경 (이후 신규 row만 영향)
alter table public.notification_consents
  alter column push_enabled set default false;

-- 기존 row는 의도적으로 backfill하지 않음.
-- push_consented_at IS NULL인 사용자는 다음 "추가하기"에서 명시적 동의 다이얼로그를 한 번 본다.
