# Random Reminder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Random Reminder MVP: an Apps in Toss mini-app for registering delayed life-admin tasks, plus a minimum backend that stores reminders, applies random send policy, chooses Toss push first and SMS fallback, logs sends, and supports consent/unsubscribe.

**Architecture:** The Apps in Toss app remains the user-facing client under `my-mini-app/`. A new TypeScript backend under `server/` owns persistence, random policy, channel choice, batch execution, and provider adapters. Provider adapters start as log-only implementations so the product can be developed and tested before final Toss push and SMS credentials are available.

**Tech Stack:** Apps in Toss, React, TDS Mobile, TypeScript, Vite, Node 24, Fastify, SQLite for local MVP persistence, Vitest for server policy tests, existing `npm run lint` and `npm run build` for app verification.

---

## File Structure

### Frontend: `my-mini-app/`

- Modify `src/App.tsx`: route between home, create, list, inbox, and detail states.
- Replace `src/pages/InAppAdsPage.tsx` and `src/pages/InAppPurchasePage.tsx` usage with Random Reminder pages.
- Create `src/types/reminder.ts`: shared frontend reminder types.
- Create `src/constants/reminderOptions.ts`: allowed time presets and intensity labels.
- Create `src/lib/api/client.ts`: typed fetch wrapper.
- Create `src/lib/api/reminders.ts`: reminder API calls.
- Create `src/hooks/useReminders.ts`: list/create/complete/snooze state.
- Create `src/pages/HomePage.tsx`: entry screen and examples.
- Create `src/pages/CreateReminderPage.tsx`: creation flow.
- Create `src/pages/ReminderListPage.tsx`: active reminders.
- Create `src/pages/InboxPage.tsx`: sent reminder history.
- Create `src/pages/ReminderDetailPage.tsx`: complete/snooze actions.
- Modify `src/App.css` and `src/index.css`: app-level layout only.
- Modify `granite.config.ts`: update brand fields when final console app name and icon are known.

### Backend: `server/`

- Create `server/package.json`: backend scripts and dependencies.
- Create `server/tsconfig.json`: TypeScript config.
- Create `server/vitest.config.ts`: test config.
- Create `server/src/app.ts`: Fastify app factory.
- Create `server/src/index.ts`: server entrypoint.
- Create `server/src/db/schema.ts`: SQLite schema setup.
- Create `server/src/db/client.ts`: database connection.
- Create `server/src/reminders/types.ts`: backend domain types.
- Create `server/src/reminders/repository.ts`: reminder persistence.
- Create `server/src/reminders/routes.ts`: create/list/update endpoints.
- Create `server/src/consents/routes.ts`: SMS consent and unsubscribe endpoints.
- Create `server/src/policy/random.ts`: seeded random helpers.
- Create `server/src/policy/schedule.ts`: candidate send generation.
- Create `server/src/policy/channel.ts`: push-first/SMS-fallback decision.
- Create `server/src/policy/limits.ts`: caps and safety checks.
- Create `server/src/providers/types.ts`: provider adapter interface.
- Create `server/src/providers/logPushProvider.ts`: log-only Toss push adapter.
- Create `server/src/providers/logSmsProvider.ts`: log-only SMS adapter.
- Create `server/src/batch/runReminderBatch.ts`: batch runner.
- Create `server/src/batch/routes.ts`: protected batch endpoint.
- Create `server/tests/policy.test.ts`: random, limits, channel tests.
- Create `server/tests/routes.test.ts`: API validation and state-change tests.

### Docs

- Modify `docs/ai-workflow/launch-checklist.md`: add Random Reminder launch-specific checks after provider details are known.
- Create `docs/ai-workflow/releases/random-reminder-mvp.md`: release notes and external dependency checklist.

---

### Task 1: Create Feature Worktree

**Files:**
- No source files modified in this task.

- [ ] **Step 1: Create the feature worktree**

Run from repo root:

```bash
scripts/create-worktree.sh random-reminder-mvp
```

Expected:

```text
Created worktree:
  branch: codex/random-reminder-mvp
  path:   .worktrees/random-reminder-mvp
```

- [ ] **Step 2: Enter the worktree**

```bash
cd .worktrees/random-reminder-mvp
git status --short --branch
```

Expected:

```text
## codex/random-reminder-mvp...origin/main
```

- [ ] **Step 3: Commit checkpoint**

No commit is needed. This task only creates isolation for implementation.

---

### Task 2: Backend Project Skeleton

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/vitest.config.ts`
- Create: `server/src/app.ts`
- Create: `server/src/index.ts`
- Create: `server/src/db/client.ts`
- Create: `server/src/db/schema.ts`

- [ ] **Step 1: Add backend package**

Create `server/package.json`:

```json
{
  "name": "random-reminder-server",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@fastify/cors": "^10.0.2",
    "better-sqlite3": "^11.8.1",
    "fastify": "^5.2.1",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/node": "^22.13.5",
    "tsx": "^4.19.3",
    "typescript": "^5.7.2",
    "vitest": "^3.0.7"
  }
}
```

- [ ] **Step 2: Add TypeScript config**

Create `server/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "types": ["node", "vitest"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Add Vitest config**

Create `server/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 4: Add database client**

Create `server/src/db/client.ts`:

```ts
import Database from "better-sqlite3";

export function createDb(path = process.env.DATABASE_PATH ?? "random-reminder.sqlite") {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}
```

- [ ] **Step 5: Add schema**

Create `server/src/db/schema.ts` with tables for `users`, `notification_consents`, `reminders`, `reminder_events`, and `send_attempts`.

Use these exact columns:

```ts
import type Database from "better-sqlite3";

export function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      toss_user_key TEXT UNIQUE,
      phone_number TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_consents (
      user_id TEXT PRIMARY KEY,
      push_enabled INTEGER NOT NULL DEFAULT 1,
      sms_enabled INTEGER NOT NULL DEFAULT 0,
      sms_unsubscribed_at TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      allowed_start_hour INTEGER NOT NULL,
      allowed_end_hour INTEGER NOT NULL,
      intensity TEXT NOT NULL,
      status TEXT NOT NULL,
      snoozed_until TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reminder_events (
      id TEXT PRIMARY KEY,
      reminder_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (reminder_id) REFERENCES reminders(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS send_attempts (
      id TEXT PRIMARY KEY,
      reminder_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL,
      reason TEXT,
      provider_message_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (reminder_id) REFERENCES reminders(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}
```

- [ ] **Step 6: Add Fastify app and entrypoint**

Create `server/src/app.ts`:

```ts
import cors from "@fastify/cors";
import Fastify from "fastify";
import { createDb } from "./db/client.js";
import { migrate } from "./db/schema.js";

export function buildApp() {
  const app = Fastify({ logger: true });
  const db = createDb();
  migrate(db);

  app.register(cors, {
    origin: true,
  });

  app.get("/health", async () => ({ ok: true }));

  app.addHook("onClose", async () => {
    db.close();
  });

  return app;
}
```

Create `server/src/index.ts`:

```ts
import { buildApp } from "./app.js";

const app = buildApp();
const port = Number(process.env.PORT ?? 53119);
const host = process.env.HOST ?? "127.0.0.1";

await app.listen({ host, port });
```

- [ ] **Step 7: Install dependencies and verify**

```bash
cd server
npm install
npm run build
```

Expected:

```text
> random-reminder-server@0.1.0 build
> tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add server/package.json server/package-lock.json server/tsconfig.json server/vitest.config.ts server/src
git commit -m "feat: add random reminder server skeleton"
```

---

### Task 3: Reminder Domain and Repository

**Files:**
- Create: `server/src/reminders/types.ts`
- Create: `server/src/reminders/repository.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/repository.test.ts`

- [ ] **Step 1: Write repository tests**

Create `server/tests/repository.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDb } from "../src/db/client.js";
import { migrate } from "../src/db/schema.js";
import { ReminderRepository } from "../src/reminders/repository.js";

describe("ReminderRepository", () => {
  it("creates and lists active reminders", () => {
    const db = createDb(":memory:");
    migrate(db);
    const repo = new ReminderRepository(db);

    const user = repo.upsertUser({ tossUserKey: "toss-user-1", phoneNumber: "01012345678" });
    repo.upsertConsent({ userId: user.id, pushEnabled: true, smsEnabled: true });
    const reminder = repo.createReminder({
      userId: user.id,
      title: "병원 예약하기",
      allowedStartHour: 9,
      allowedEndHour: 18,
      intensity: "normal",
    });

    expect(reminder.title).toBe("병원 예약하기");
    expect(repo.listActiveReminders(user.id)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server
npm run test -- repository.test.ts
```

Expected: FAIL because `ReminderRepository` does not exist.

- [ ] **Step 3: Add domain types**

Create `server/src/reminders/types.ts`:

```ts
export type ReminderIntensity = "gentle" | "normal" | "strong";
export type ReminderStatus = "active" | "completed" | "disabled";
export type Channel = "push" | "sms";
export type SendStatus = "sent" | "failed" | "skipped";

export interface User {
  id: string;
  tossUserKey: string;
  phoneNumber: string | null;
  createdAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  allowedStartHour: number;
  allowedEndHour: number;
  intensity: ReminderIntensity;
  status: ReminderStatus;
  snoozedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 4: Add repository**

Create `server/src/reminders/repository.ts` with methods used by the test:

```ts
import crypto from "node:crypto";
import type Database from "better-sqlite3";
import type { Reminder, ReminderIntensity, User } from "./types.js";

function nowIso() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export class ReminderRepository {
  constructor(private readonly db: Database.Database) {}

  upsertUser(input: { tossUserKey: string; phoneNumber?: string | null }): User {
    const existing = this.db
      .prepare("SELECT * FROM users WHERE toss_user_key = ?")
      .get(input.tossUserKey) as any;

    if (existing) {
      this.db
        .prepare("UPDATE users SET phone_number = COALESCE(?, phone_number) WHERE id = ?")
        .run(input.phoneNumber ?? null, existing.id);
      return this.mapUser(this.db.prepare("SELECT * FROM users WHERE id = ?").get(existing.id) as any);
    }

    const user = {
      id: id("user"),
      tossUserKey: input.tossUserKey,
      phoneNumber: input.phoneNumber ?? null,
      createdAt: nowIso(),
    };
    this.db
      .prepare("INSERT INTO users (id, toss_user_key, phone_number, created_at) VALUES (?, ?, ?, ?)")
      .run(user.id, user.tossUserKey, user.phoneNumber, user.createdAt);
    return user;
  }

  upsertConsent(input: { userId: string; pushEnabled: boolean; smsEnabled: boolean }) {
    this.db
      .prepare(`
        INSERT INTO notification_consents (user_id, push_enabled, sms_enabled, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          push_enabled = excluded.push_enabled,
          sms_enabled = excluded.sms_enabled,
          updated_at = excluded.updated_at
      `)
      .run(input.userId, input.pushEnabled ? 1 : 0, input.smsEnabled ? 1 : 0, nowIso());
  }

  createReminder(input: {
    userId: string;
    title: string;
    allowedStartHour: number;
    allowedEndHour: number;
    intensity: ReminderIntensity;
  }): Reminder {
    const createdAt = nowIso();
    const reminder = {
      id: id("rem"),
      userId: input.userId,
      title: input.title,
      allowedStartHour: input.allowedStartHour,
      allowedEndHour: input.allowedEndHour,
      intensity: input.intensity,
      status: "active" as const,
      snoozedUntil: null,
      createdAt,
      updatedAt: createdAt,
    };
    this.db
      .prepare(`
        INSERT INTO reminders
          (id, user_id, title, allowed_start_hour, allowed_end_hour, intensity, status, snoozed_until, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        reminder.id,
        reminder.userId,
        reminder.title,
        reminder.allowedStartHour,
        reminder.allowedEndHour,
        reminder.intensity,
        reminder.status,
        reminder.snoozedUntil,
        reminder.createdAt,
        reminder.updatedAt,
      );
    return reminder;
  }

  listActiveReminders(userId: string): Reminder[] {
    return (this.db
      .prepare("SELECT * FROM reminders WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC")
      .all(userId) as any[]).map((row) => this.mapReminder(row));
  }

  private mapUser(row: any): User {
    return {
      id: row.id,
      tossUserKey: row.toss_user_key,
      phoneNumber: row.phone_number,
      createdAt: row.created_at,
    };
  }

  private mapReminder(row: any): Reminder {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      allowedStartHour: row.allowed_start_hour,
      allowedEndHour: row.allowed_end_hour,
      intensity: row.intensity,
      status: row.status,
      snoozedUntil: row.snoozed_until,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
```

- [ ] **Step 5: Run tests**

```bash
cd server
npm run test -- repository.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/reminders server/tests/repository.test.ts
git commit -m "feat: add reminder repository"
```

---

### Task 4: Random Policy and Channel Decision

**Files:**
- Create: `server/src/policy/random.ts`
- Create: `server/src/policy/limits.ts`
- Create: `server/src/policy/channel.ts`
- Create: `server/tests/policy.test.ts`

- [ ] **Step 1: Write policy tests**

Create `server/tests/policy.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { chooseChannel } from "../src/policy/channel.js";
import { isInsideAllowedWindow, isNightRestricted, maxDailySendsForIntensity } from "../src/policy/limits.js";
import { seededRandomInt } from "../src/policy/random.js";

describe("random reminder policy", () => {
  it("maps intensity to daily candidate send counts", () => {
    expect(maxDailySendsForIntensity("gentle")).toBe(1);
    expect(maxDailySendsForIntensity("normal")).toBe(2);
    expect(maxDailySendsForIntensity("strong")).toBe(3);
  });

  it("blocks night sends", () => {
    expect(isNightRestricted(new Date("2026-04-25T12:00:00+09:00"))).toBe(false);
    expect(isNightRestricted(new Date("2026-04-25T22:00:00+09:00"))).toBe(true);
  });

  it("checks allowed user windows", () => {
    expect(isInsideAllowedWindow(10, 9, 18)).toBe(true);
    expect(isInsideAllowedWindow(20, 9, 18)).toBe(false);
  });

  it("uses deterministic seeded random integers", () => {
    expect(seededRandomInt("reminder-1:2026-04-25", 0, 10)).toBe(seededRandomInt("reminder-1:2026-04-25", 0, 10));
  });

  it("chooses push before SMS when push is available", () => {
    expect(chooseChannel({ pushEligible: true, smsEligible: true })).toEqual({ channel: "push", reason: "push_eligible" });
  });

  it("uses SMS when push is unavailable and SMS is eligible", () => {
    expect(chooseChannel({ pushEligible: false, smsEligible: true })).toEqual({ channel: "sms", reason: "push_unavailable_sms_eligible" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server
npm run test -- policy.test.ts
```

Expected: FAIL because policy files do not exist.

- [ ] **Step 3: Implement deterministic random helper**

Create `server/src/policy/random.ts`:

```ts
import crypto from "node:crypto";

export function seededRandomInt(seed: string, minInclusive: number, maxExclusive: number) {
  const hash = crypto.createHash("sha256").update(seed).digest();
  const value = hash.readUInt32BE(0) / 0xffffffff;
  return Math.floor(value * (maxExclusive - minInclusive)) + minInclusive;
}
```

- [ ] **Step 4: Implement limits**

Create `server/src/policy/limits.ts`:

```ts
import type { ReminderIntensity } from "../reminders/types.js";

export function maxDailySendsForIntensity(intensity: ReminderIntensity) {
  if (intensity === "gentle") return 1;
  if (intensity === "normal") return 2;
  return 3;
}

export function isNightRestricted(date: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", hour: "2-digit", hour12: false }).format(date));
  return hour >= 21 || hour < 9;
}

export function isInsideAllowedWindow(hour: number, startHour: number, endHour: number) {
  return hour >= startHour && hour < endHour;
}
```

- [ ] **Step 5: Implement channel decision**

Create `server/src/policy/channel.ts`:

```ts
import type { Channel } from "../reminders/types.js";

export function chooseChannel(input: { pushEligible: boolean; smsEligible: boolean }): { channel: Channel | null; reason: string } {
  if (input.pushEligible) {
    return { channel: "push", reason: "push_eligible" };
  }
  if (input.smsEligible) {
    return { channel: "sms", reason: "push_unavailable_sms_eligible" };
  }
  return { channel: null, reason: "no_eligible_channel" };
}
```

- [ ] **Step 6: Run tests**

```bash
cd server
npm run test -- policy.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/policy server/tests/policy.test.ts
git commit -m "feat: add random reminder policy"
```

---

### Task 5: Backend API Routes

**Files:**
- Create: `server/src/reminders/routes.ts`
- Create: `server/src/consents/routes.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/routes.test.ts`

- [ ] **Step 1: Write route tests**

Create `server/tests/routes.test.ts` covering:

```ts
import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

describe("reminder API", () => {
  it("creates and lists a reminder", async () => {
    const app = buildApp({ databasePath: ":memory:" });

    const create = await app.inject({
      method: "POST",
      url: "/api/reminders",
      payload: {
        tossUserKey: "toss-user-1",
        phoneNumber: "01012345678",
        smsEnabled: true,
        title: "구독 해지하기",
        allowedStartHour: 9,
        allowedEndHour: 18,
        intensity: "normal",
      },
    });

    expect(create.statusCode).toBe(201);

    const list = await app.inject({
      method: "GET",
      url: "/api/reminders?tossUserKey=toss-user-1",
    });

    expect(list.statusCode).toBe(200);
    expect(list.json().reminders).toHaveLength(1);

    await app.close();
  });
});
```

- [ ] **Step 2: Update `buildApp` signature**

Modify `server/src/app.ts` so `buildApp` accepts `{ databasePath?: string }`.

- [ ] **Step 3: Add routes**

Implement:

- `POST /api/reminders`
- `GET /api/reminders?tossUserKey=...`
- `POST /api/reminders/:id/complete`
- `POST /api/reminders/:id/snooze`
- `POST /api/consents/sms`
- `POST /api/consents/sms/unsubscribe`

Validate inputs with `zod`. Return `400` for invalid input.

- [ ] **Step 4: Register routes**

Modify `server/src/app.ts` to create `ReminderRepository` and register route modules.

- [ ] **Step 5: Run route tests**

```bash
cd server
npm run test -- routes.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/app.ts server/src/reminders/routes.ts server/src/consents/routes.ts server/tests/routes.test.ts
git commit -m "feat: add reminder API routes"
```

---

### Task 6: Provider Adapters and Batch Runner

**Files:**
- Create: `server/src/providers/types.ts`
- Create: `server/src/providers/logPushProvider.ts`
- Create: `server/src/providers/logSmsProvider.ts`
- Create: `server/src/batch/runReminderBatch.ts`
- Create: `server/src/batch/routes.ts`
- Modify: `server/src/app.ts`
- Test: `server/tests/batch.test.ts`

- [ ] **Step 1: Write batch test**

Create `server/tests/batch.test.ts` that creates one active reminder with SMS consent, runs the batch with push disabled and SMS enabled, and expects one `send_attempts` row with channel `sms`.

- [ ] **Step 2: Add provider interface**

Create `server/src/providers/types.ts`:

```ts
export interface SendMessageInput {
  userId: string;
  reminderId: string;
  title: string;
}

export interface SendMessageResult {
  ok: boolean;
  providerMessageId?: string;
  errorReason?: string;
}

export interface ReminderProvider {
  send(input: SendMessageInput): Promise<SendMessageResult>;
}
```

- [ ] **Step 3: Add log-only providers**

Create log providers that return `{ ok: true, providerMessageId: "log-..." }` and print fixed message content.

- [ ] **Step 4: Add batch runner**

Implement `runReminderBatch` to:

1. Load active reminders.
2. Skip reminders outside allowed windows, night restrictions, caps, and snooze windows.
3. Choose push first, SMS fallback.
4. Call provider adapter.
5. Insert `send_attempts`.
6. Insert `reminder_events`.

- [ ] **Step 5: Add protected batch endpoint**

Create `POST /api/batch/reminders` that requires header:

```text
x-batch-secret: process.env.BATCH_SECRET
```

Return `401` if missing or wrong.

- [ ] **Step 6: Run tests**

```bash
cd server
npm run test -- batch.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/providers server/src/batch server/src/app.ts server/tests/batch.test.ts
git commit -m "feat: add reminder batch runner"
```

---

### Task 7: Frontend API Layer and Types

**Files:**
- Create: `my-mini-app/src/types/reminder.ts`
- Create: `my-mini-app/src/constants/reminderOptions.ts`
- Create: `my-mini-app/src/lib/api/client.ts`
- Create: `my-mini-app/src/lib/api/reminders.ts`
- Create: `my-mini-app/src/hooks/useReminders.ts`

- [ ] **Step 1: Add frontend types**

Create `my-mini-app/src/types/reminder.ts` with:

```ts
export type ReminderIntensity = "gentle" | "normal" | "strong";

export interface Reminder {
  id: string;
  title: string;
  allowedStartHour: number;
  allowedEndHour: number;
  intensity: ReminderIntensity;
  status: "active" | "completed" | "disabled";
  snoozedUntil: string | null;
  createdAt: string;
}

export interface CreateReminderInput {
  tossUserKey: string;
  phoneNumber?: string;
  smsEnabled: boolean;
  title: string;
  allowedStartHour: number;
  allowedEndHour: number;
  intensity: ReminderIntensity;
}
```

- [ ] **Step 2: Add constants**

Create `my-mini-app/src/constants/reminderOptions.ts` with allowed time presets and intensity labels.

- [ ] **Step 3: Add API client**

Create a typed fetch wrapper that reads:

```ts
const API_BASE_URL = import.meta.env.VITE_RANDOM_REMINDER_API_URL ?? "http://localhost:53119";
```

- [ ] **Step 4: Add reminder API functions**

Create functions:

- `createReminder(input)`
- `listReminders(tossUserKey)`
- `completeReminder(id)`
- `snoozeReminder(id)`

- [ ] **Step 5: Add `useReminders` hook**

The hook should expose `reminders`, `loading`, `error`, `refresh`, `create`, `complete`, and `snooze`.

- [ ] **Step 6: Typecheck app**

```bash
cd my-mini-app
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add my-mini-app/src/types my-mini-app/src/constants my-mini-app/src/lib my-mini-app/src/hooks/useReminders.ts
git commit -m "feat: add reminder frontend API layer"
```

---

### Task 8: Frontend Screens

**Files:**
- Modify: `my-mini-app/src/App.tsx`
- Create: `my-mini-app/src/pages/HomePage.tsx`
- Create: `my-mini-app/src/pages/CreateReminderPage.tsx`
- Create: `my-mini-app/src/pages/ReminderListPage.tsx`
- Create: `my-mini-app/src/pages/InboxPage.tsx`
- Create: `my-mini-app/src/pages/ReminderDetailPage.tsx`
- Modify: `my-mini-app/src/App.css`
- Modify: `my-mini-app/src/index.css`

- [ ] **Step 1: Replace demo app routing**

Modify `App.tsx` to manage page state:

```ts
type Page = "home" | "create" | "list" | "inbox" | "detail";
```

Use a temporary development user key:

```ts
const DEV_TOSS_USER_KEY = "local-dev-user";
```

This must be replaced with the approved Apps in Toss user identity mechanism before production.

- [ ] **Step 2: Add home screen**

Show examples and primary CTA. Use TDS components only where available.

- [ ] **Step 3: Add create screen**

Inputs:

- title
- allowed time preset
- intensity
- SMS enabled
- phone number when SMS enabled

- [ ] **Step 4: Add list screen**

Show active reminders and CTA to create another.

- [ ] **Step 5: Add inbox screen**

Use the current reminders/events API if available. If send history endpoint is not implemented yet, show an empty state with explicit copy that reminders will appear after the first send.

- [ ] **Step 6: Add detail screen**

Actions:

- complete
- snooze
- back

- [ ] **Step 7: Verify**

```bash
cd my-mini-app
npm run lint
npm run build
```

Expected: PASS. Existing template hook warnings should be removed if old ad/purchase hooks are no longer used.

- [ ] **Step 8: Commit**

```bash
git add my-mini-app/src/App.tsx my-mini-app/src/pages my-mini-app/src/App.css my-mini-app/src/index.css
git commit -m "feat: build random reminder app screens"
```

---

### Task 9: Local End-to-End Wiring

**Files:**
- Modify: `my-mini-app/package.json`
- Modify: `server/package.json`
- Create: `.env.example`
- Create: `docs/ai-workflow/releases/random-reminder-mvp.md`

- [ ] **Step 1: Add root developer instructions**

Create `.env.example`:

```text
VITE_RANDOM_REMINDER_API_URL=http://localhost:53119
DATABASE_PATH=random-reminder.sqlite
BATCH_SECRET=local-dev-secret
```

- [ ] **Step 2: Document local run sequence**

Create `docs/ai-workflow/releases/random-reminder-mvp.md`:

```markdown
# Random Reminder MVP Release Notes

## Local Run

1. Start backend:
   `cd server && npm run dev`

2. Start Apps in Toss app:
   `cd my-mini-app && npm run dev`

3. Open:
   `http://localhost:53118/`

## External Launch Dependencies

- Approved Toss push sending integration.
- SMS provider credentials.
- Production database.
- Production scheduler for `POST /api/batch/reminders`.
- SMS unsubscribe copy and compliance review.
```

- [ ] **Step 3: Verify full local stack**

Run:

```bash
cd server
npm run build
npm run test
```

Run:

```bash
cd my-mini-app
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add .env.example docs/ai-workflow/releases/random-reminder-mvp.md my-mini-app/package.json server/package.json
git commit -m "docs: add random reminder local runbook"
```

---

### Task 10: Launch Readiness Pass

**Files:**
- Modify: `docs/ai-workflow/launch-checklist.md`
- Modify: `my-mini-app/granite.config.ts`
- Modify: `my-mini-app/index.html`

- [ ] **Step 1: Update launch checklist**

Add Random Reminder-specific checks:

- SMS consent text reviewed.
- SMS unsubscribe path tested.
- Daily SMS cap tested.
- Night restriction tested.
- Push unavailable fallback tested.
- Provider failures do not block app usage.

- [ ] **Step 2: Verify pinch zoom is disabled**

Ensure `my-mini-app/index.html` contains:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

- [ ] **Step 3: Update brand config**

Set final values in `my-mini-app/granite.config.ts` after the Apps in Toss console app name is known:

```ts
appName: "random-reminder",
brand: {
  displayName: "랜덤 리마인더",
  primaryColor: "#3182F6",
  icon: "",
},
```

- [ ] **Step 4: Verify build**

```bash
cd my-mini-app
npm run build
```

Expected: `.ait` artifact created.

- [ ] **Step 5: Commit**

```bash
git add docs/ai-workflow/launch-checklist.md my-mini-app/granite.config.ts my-mini-app/index.html
git commit -m "chore: prepare random reminder launch checklist"
```

---

## Self-Review

### Spec Coverage

- Task registration: Tasks 7 and 8.
- Allowed time window: Tasks 4, 7, and 8.
- Random intensity: Tasks 4, 7, and 8.
- Toss push first, SMS fallback: Tasks 4 and 6.
- Consent/unsubscribe: Tasks 3, 5, and 6.
- Server batch sending: Task 6.
- Fixed SMS template: Task 6.
- Night restriction and caps: Task 4 and Task 6.
- Completion/snooze: Tasks 5 and 8.
- Launch readiness: Tasks 9 and 10.

### Placeholder Scan

Provider credentials and final Toss push integration remain external launch dependencies. The plan intentionally starts with log-only adapters so implementation can proceed without blocked secrets. All code-facing steps define concrete files, commands, and expected outcomes.

### Execution Choice

Plan complete and saved to `docs/superpowers/plans/2026-04-25-random-reminder.md`.

Recommended execution: **Subagent-Driven**. Each task is bounded, reviewable, and can be committed independently.
