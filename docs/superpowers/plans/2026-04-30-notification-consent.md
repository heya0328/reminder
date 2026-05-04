# Notification Consent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 첫 할일 추가 시점에 푸시 알림 동의를 받고, 동의 여부를 서버에 영구 저장해 이후엔 다시 묻지 않는다.

**Architecture:**
- Supabase `notification_consents` 테이블에 `push_consented_at timestamptz` 컬럼 추가. 신규 사용자의 `push_enabled` 기본값은 `false`로 변경.
- 클라이언트는 로그인 직후 동의 상태를 1회 조회해 App 레벨 상태로 보유. `CreateReminderPage`의 "추가하기" CTA 클릭 시점에 미동의면 TDS `ConfirmDialog`를 띄움 → 동의 시 서버에 기록 후 기존 생성 + 광고 플로우 그대로 진행.
- 동의 모달은 한 번 통과하면 서버 상태로 영구 저장되어 재노출되지 않음.

**Tech Stack:** React + TypeScript + Vite, `@toss/tds-mobile` (ConfirmDialog), Supabase REST.

**Trigger Page:** `my-mini-app/src/pages/CreateReminderPage.tsx` (제목 "할 일 추가", CTA "추가하기")

---

## File Structure

**Create:**
- `my-mini-app/src/lib/api/consent.ts` — Supabase 동의 조회/기록 함수
- `my-mini-app/src/hooks/useNotificationConsent.ts` — 동의 상태 훅 (로딩/조회/기록)
- `my-mini-app/src/components/NotificationConsentDialog.tsx` — TDS ConfirmDialog 래퍼

**Modify:**
- `docs/ai-workflow/supabase-schema.sql` — 컬럼 추가 + 기본값 변경
- `my-mini-app/src/lib/api/reminders.ts:59-66` — `ensureUser` 신규 동의 row 기본값 `push_enabled: false`, `push_consented_at: null`
- `my-mini-app/src/App.tsx` — `useNotificationConsent` 호출, props로 `CreateReminderPage`에 주입
- `my-mini-app/src/pages/CreateReminderPage.tsx` — 동의 미여부 시 다이얼로그 → 동의 후 `onCreate` 진행

---

## Task 1: Supabase 스키마 마이그레이션

**Files:**
- Modify: `docs/ai-workflow/supabase-schema.sql`
- Create (수동 실행용 SQL 메모): `docs/ai-workflow/migrations/2026-04-30-add-push-consented-at.sql`

- [ ] **Step 1: 스키마 파일 수정**

`docs/ai-workflow/supabase-schema.sql`의 `notification_consents` 정의를 다음으로 교체:

```sql
create table if not exists public.notification_consents (
  user_id text primary key references public.users(id) on delete cascade,
  push_enabled boolean not null default false,
  push_consented_at timestamptz,
  sms_enabled boolean not null default false,
  sms_unsubscribed_at timestamptz,
  updated_at timestamptz not null
);
```

- [ ] **Step 2: 마이그레이션 SQL 작성 (Supabase 콘솔에서 실행)**

`docs/ai-workflow/migrations/2026-04-30-add-push-consented-at.sql` 파일 생성:

```sql
-- 컬럼 추가
alter table public.notification_consents
  add column if not exists push_consented_at timestamptz;

-- 기본값 변경 (이후 신규 row만 영향)
alter table public.notification_consents
  alter column push_enabled set default false;
```

- [ ] **Step 3: 사용자에게 Supabase 콘솔에서 마이그레이션 실행 요청**

작업 완료 보고 시 "Supabase 콘솔 → SQL Editor에서 `2026-04-30-add-push-consented-at.sql`을 실행해 주세요" 안내. 자동 실행하지 말 것.

- [ ] **Step 4: 커밋**

```bash
git add docs/ai-workflow/supabase-schema.sql docs/ai-workflow/migrations/2026-04-30-add-push-consented-at.sql
git commit -m "feat(schema): add push_consented_at column for explicit consent tracking"
```

---

## Task 2: 신규 사용자 기본값을 비동의로 변경

**Files:**
- Modify: `my-mini-app/src/lib/api/reminders.ts:59-66`

- [ ] **Step 1: `ensureUser`의 consent 기본값 수정**

기존:
```ts
await supabasePost("notification_consents", {
  user_id: userId,
  push_enabled: true,
  sms_enabled: false,
  sms_unsubscribed_at: null,
  updated_at: new Date().toISOString(),
});
```

다음으로 변경:
```ts
await supabasePost("notification_consents", {
  user_id: userId,
  push_enabled: false,
  push_consented_at: null,
  sms_enabled: false,
  sms_unsubscribed_at: null,
  updated_at: new Date().toISOString(),
});
```

- [ ] **Step 2: 빌드/타입 체크**

```bash
cd "/Users/soon/Documents/New project/my-mini-app" && npm run build
```
Expected: 에러 없이 빌드 성공.

- [ ] **Step 3: 커밋**

```bash
git add my-mini-app/src/lib/api/reminders.ts
git commit -m "feat(consent): default new users to push_enabled=false"
```

---

## Task 3: Consent API 클라이언트 작성

**Files:**
- Create: `my-mini-app/src/lib/api/consent.ts`

- [ ] **Step 1: 파일 생성**

```ts
import { supabaseGet, supabasePatch } from "./supabase";

interface SupabaseConsent {
  user_id: string;
  push_enabled: boolean;
  push_consented_at: string | null;
}

interface SupabaseUser {
  id: string;
}

export interface ConsentState {
  pushEnabled: boolean;
  pushConsentedAt: string | null;
}

async function findUserId(tossUserKey: string): Promise<string | null> {
  const users = await supabaseGet<SupabaseUser[]>(
    "users",
    `toss_user_key=eq.${encodeURIComponent(tossUserKey)}&select=id`,
  );
  return users[0]?.id ?? null;
}

export async function getConsent(tossUserKey: string): Promise<ConsentState | null> {
  const userId = await findUserId(tossUserKey);
  if (!userId) return null;

  const rows = await supabaseGet<SupabaseConsent[]>(
    "notification_consents",
    `user_id=eq.${encodeURIComponent(userId)}&select=push_enabled,push_consented_at`,
  );
  const row = rows[0];
  if (!row) return null;
  return { pushEnabled: row.push_enabled, pushConsentedAt: row.push_consented_at };
}

export async function recordPushConsent(tossUserKey: string): Promise<ConsentState> {
  const userId = await findUserId(tossUserKey);
  if (!userId) throw new Error("동의를 저장할 사용자 정보가 없어요.");

  const now = new Date().toISOString();
  const rows = await supabasePatch<SupabaseConsent[]>(
    "notification_consents",
    `user_id=eq.${encodeURIComponent(userId)}`,
    {
      push_enabled: true,
      push_consented_at: now,
      updated_at: now,
    },
  );
  const row = rows[0];
  return { pushEnabled: row.push_enabled, pushConsentedAt: row.push_consented_at };
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd "/Users/soon/Documents/New project/my-mini-app" && npm run build
```
Expected: 빌드 성공.

- [ ] **Step 3: 커밋**

```bash
git add my-mini-app/src/lib/api/consent.ts
git commit -m "feat(consent): add Supabase consent get/patch client"
```

---

## Task 4: useNotificationConsent 훅

**Files:**
- Create: `my-mini-app/src/hooks/useNotificationConsent.ts`

- [ ] **Step 1: 훅 작성**

```ts
import { useCallback, useEffect, useRef, useState } from "react";

import { getConsent, recordPushConsent } from "../lib/api/consent";

interface State {
  hasConsented: boolean;
  loading: boolean;
  error: string | null;
}

export function useNotificationConsent(tossUserKey: string | null) {
  const [state, setState] = useState<State>({
    hasConsented: false,
    loading: false,
    error: null,
  });
  const fetchedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!tossUserKey) return;
    if (fetchedKeyRef.current === tossUserKey) return;
    fetchedKeyRef.current = tossUserKey;

    setState((prev) => ({ ...prev, loading: true, error: null }));
    void getConsent(tossUserKey)
      .then((consent) => {
        setState({
          hasConsented: Boolean(consent?.pushEnabled && consent?.pushConsentedAt),
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        setState({
          hasConsented: false,
          loading: false,
          error: err instanceof Error ? err.message : "동의 정보를 불러오지 못했어요.",
        });
      });
  }, [tossUserKey]);

  const consent = useCallback(async () => {
    if (!tossUserKey) throw new Error("로그인이 필요해요.");
    const next = await recordPushConsent(tossUserKey);
    setState({
      hasConsented: Boolean(next.pushEnabled && next.pushConsentedAt),
      loading: false,
      error: null,
    });
  }, [tossUserKey]);

  return {
    hasConsented: state.hasConsented,
    loading: state.loading,
    error: state.error,
    consent,
  };
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd "/Users/soon/Documents/New project/my-mini-app" && npm run build
```

- [ ] **Step 3: 커밋**

```bash
git add my-mini-app/src/hooks/useNotificationConsent.ts
git commit -m "feat(consent): add useNotificationConsent hook"
```

---

## Task 5: NotificationConsentDialog 컴포넌트

**Files:**
- Create: `my-mini-app/src/components/NotificationConsentDialog.tsx`

- [ ] **Step 1: 컴포넌트 작성 (TDS ConfirmDialog 사용)**

```tsx
import { ConfirmDialog } from "@toss/tds-mobile";

interface NotificationConsentDialogProps {
  open: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function NotificationConsentDialog({
  open,
  loading,
  onConfirm,
  onCancel,
}: NotificationConsentDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onCancel}
      title="알림을 보내드릴게요"
      description={
        "등록하신 할 일을 잊지 않도록 토스 푸시로 다시 떠올려드려요.\n광고성 메시지는 보내지 않아요. 설정에서 언제든 해제할 수 있어요."
      }
      confirmButton={
        <ConfirmDialog.ConfirmButton size="large" loading={loading} disabled={loading} onClick={onConfirm}>
          동의하고 시작하기
        </ConfirmDialog.ConfirmButton>
      }
      cancelButton={
        <ConfirmDialog.CancelButton size="large" disabled={loading} onClick={onCancel}>
          취소
        </ConfirmDialog.CancelButton>
      }
    />
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd "/Users/soon/Documents/New project/my-mini-app" && npm run build
```

- [ ] **Step 3: 커밋**

```bash
git add my-mini-app/src/components/NotificationConsentDialog.tsx
git commit -m "feat(consent): add NotificationConsentDialog with TDS ConfirmDialog"
```

---

## Task 6: App.tsx에 consent 상태 연결

**Files:**
- Modify: `my-mini-app/src/App.tsx`

- [ ] **Step 1: import 추가**

`App.tsx` 상단 import 블록에 추가:
```ts
import { useNotificationConsent } from "./hooks/useNotificationConsent";
```

- [ ] **Step 2: 훅 호출 추가**

`function App()` 내부, `const reminders = useReminders(auth.userKey);` 바로 아래에 추가:
```ts
const consent = useNotificationConsent(auth.userKey);
```

- [ ] **Step 3: CreateReminderPage에 prop 주입**

`page === "create"` 분기 (현재 99~110번 라인)를 다음으로 교체:
```tsx
if (page === "create") {
  pageContent = (
    <CreateReminderPage
      error={reminders.error}
      hasConsented={consent.hasConsented}
      consentLoading={consent.loading}
      onRequestConsent={consent.consent}
      onBack={() => router.back()}
      onCreated={() => ad.showAd(() => {
        router.navigate("/");
        showSuccessToast("일정을 추가했어요.");
      })}
      onCreate={reminders.create}
    />
  );
}
```

- [ ] **Step 4: 빌드 확인**

```bash
cd "/Users/soon/Documents/New project/my-mini-app" && npm run build
```
Expected: `CreateReminderPageProps`에 새 prop이 없어 타입 에러. Task 7에서 해결.

- [ ] **Step 5: 커밋 (다음 Task와 함께 묶을 거라 생략 가능)**

생략하고 Task 7로 진행.

---

## Task 7: CreateReminderPage에 동의 게이팅 적용

**Files:**
- Modify: `my-mini-app/src/pages/CreateReminderPage.tsx`

- [ ] **Step 1: import 추가**

기존 import에 추가:
```ts
import { NotificationConsentDialog } from "../components/NotificationConsentDialog";
```

- [ ] **Step 2: Props 인터페이스 확장**

`CreateReminderPageProps`를 다음으로 교체:
```ts
interface CreateReminderPageProps {
  error: string | null;
  hasConsented: boolean;
  consentLoading: boolean;
  onBack: () => void;
  onCreated: () => void;
  onCreate: (input: Omit<CreateReminderInput, "tossUserKey">) => Promise<void>;
  onRequestConsent: () => Promise<void>;
}
```

함수 시그니처도 동일하게:
```ts
export function CreateReminderPage({
  error,
  hasConsented,
  consentLoading,
  onCreated,
  onCreate,
  onRequestConsent,
}: CreateReminderPageProps) {
```

- [ ] **Step 3: 다이얼로그 상태 + pending payload 추가**

`useState` 선언부 아래에 추가:
```ts
const [consentDialogOpen, setConsentDialogOpen] = useState(false);
const [consentSubmitting, setConsentSubmitting] = useState(false);
const pendingPayloadRef = useRef<Omit<CreateReminderInput, "tossUserKey"> | null>(null);
```

- [ ] **Step 4: 실제 생성 로직 분리 + 게이팅**

기존 `submitReminder` 함수 전체를 다음으로 교체:

```ts
async function performCreate(payload: Omit<CreateReminderInput, "tossUserKey">) {
  setSubmitting(true);
  try {
    await onCreate(payload);
    onCreated();
  } catch (caughtError) {
    setFormError(
      caughtError instanceof Error
        ? caughtError.message
        : "리마인더를 만들지 못했어요.",
    );
  } finally {
    setSubmitting(false);
  }
}

async function submitReminder() {
  setFormError(null);
  setTitleError(false);

  if (title.trim().length === 0) {
    setTitleError(true);
    return;
  }

  const payload: Omit<CreateReminderInput, "tossUserKey"> = {
    title: title.trim(),
    allowedStartHour: 9,
    allowedEndHour: 22,
    intensity: priorityToIntensity[priority],
    randomness,
  };

  if (!hasConsented) {
    pendingPayloadRef.current = payload;
    setConsentDialogOpen(true);
    return;
  }

  await performCreate(payload);
}

async function handleConsentConfirm() {
  setConsentSubmitting(true);
  try {
    await onRequestConsent();
    setConsentDialogOpen(false);
    const payload = pendingPayloadRef.current;
    pendingPayloadRef.current = null;
    if (payload) {
      await performCreate(payload);
    }
  } catch (caughtError) {
    setFormError(
      caughtError instanceof Error
        ? caughtError.message
        : "동의 저장에 실패했어요. 다시 시도해 주세요.",
    );
    setConsentDialogOpen(false);
  } finally {
    setConsentSubmitting(false);
  }
}

function handleConsentCancel() {
  pendingPayloadRef.current = null;
  setConsentDialogOpen(false);
}
```

- [ ] **Step 5: CTA disabled/loading 보강 + 다이얼로그 마운트**

기존 `FixedBottomCTA`의 `loading`/`disabled`를 동의 로딩까지 반영:
```tsx
{!keyboardOpen && (
  <FixedBottomCTA
    size="large"
    loading={submitting || consentSubmitting}
    disabled={submitting || consentSubmitting || consentLoading}
    onClick={submitReminder}
  >
    추가하기
  </FixedBottomCTA>
)}
```

`</main>` 직전에 다이얼로그 추가:
```tsx
<NotificationConsentDialog
  open={consentDialogOpen}
  loading={consentSubmitting}
  onConfirm={handleConsentConfirm}
  onCancel={handleConsentCancel}
/>
```

- [ ] **Step 6: 빌드 + 린트**

```bash
cd "/Users/soon/Documents/New project/my-mini-app" && npm run lint && npm run build
```
Expected: 에러 없음.

- [ ] **Step 7: 커밋**

```bash
git add my-mini-app/src/App.tsx my-mini-app/src/pages/CreateReminderPage.tsx my-mini-app/src/components/NotificationConsentDialog.tsx
git commit -m "feat(consent): gate first reminder creation with push consent dialog"
```

---

## Task 8: 수동 검증

- [ ] **Step 1: dev 서버 실행 (사용자 직접)**

```bash
cd "/Users/soon/Documents/New project/my-mini-app" && npm run dev
```

- [ ] **Step 2: 시나리오 검증**

1. 신규 사용자(또는 Supabase에서 본인 row의 `push_consented_at = null`, `push_enabled = false`로 리셋 후)로 진입
2. 홈 → 추가하기 → 폼 작성 → "추가하기" 탭
3. **동의 다이얼로그 노출 확인** ("알림을 보내드릴게요")
4. "동의하고 시작하기" 탭 → 다이얼로그 닫힘 → 광고 재생 → 홈 복귀 + 토스트
5. Supabase에서 `notification_consents.push_consented_at`이 채워지고 `push_enabled = true`인지 확인
6. 다시 추가하기 시 다이얼로그가 **노출되지 않고** 바로 광고로 진행되는지 확인
7. 취소 시 다이얼로그 닫히고 reminder 생성·광고 모두 발생하지 않는지 확인

---

## Self-Review Checklist

- [x] 트리거: `CreateReminderPage`의 "추가하기" CTA (요청대로 첫 할 일 추가 시점)
- [x] 광고 흐름 유지: `onCreated` → `ad.showAd` 그대로
- [x] 1회 이후 미노출: 서버 `push_consented_at` 게이팅 + 클라 `useNotificationConsent` 캐시
- [x] 영구 저장: Supabase `notification_consents`
- [x] TDS만 사용: `ConfirmDialog` (앱인토스 규칙 1)
- [x] 모듈화: API/훅/컴포넌트 분리 (CLAUDE.md 규칙 2)
- [x] 비토스 환경 안전: 다이얼로그/Supabase 호출에 try-catch
