import fs from "node:fs";
import path from "node:path";
import type { NotificationConsent, Reminder, ReminderEvent, SendAttempt, User } from "../reminders/types.ts";

export interface ReminderStoreData {
  users: User[];
  consents: NotificationConsent[];
  reminders: Reminder[];
  events: ReminderEvent[];
  attempts: SendAttempt[];
}

export interface ReminderStore {
  data: ReminderStoreData;
  ready: Promise<void>;
  persist(): void;
  close(): void;
}

function emptyData(): ReminderStoreData {
  return {
    users: [],
    consents: [],
    reminders: [],
    events: [],
    attempts: [],
  };
}

export function createDb(filePath = process.env.DATABASE_PATH ?? "random-reminder.json"): ReminderStore {
  if (filePath === ":memory:") {
    return {
      data: emptyData(),
      ready: Promise.resolve(),
      persist() {},
      close() {},
    };
  }

  if (process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY) {
    return createSupabaseStore(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY);
  }

  const resolved = path.resolve(filePath);
  const data = fs.existsSync(resolved) ? (JSON.parse(fs.readFileSync(resolved, "utf-8")) as ReminderStoreData) : emptyData();

  return {
    data,
    ready: Promise.resolve(),
    persist() {
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
      fs.writeFileSync(resolved, `${JSON.stringify(data, null, 2)}\n`);
    },
    close() {
      this.persist();
    },
  };
}

function createSupabaseStore(url: string, key: string): ReminderStore {
  const data = emptyData();
  const baseUrl = url.replace(/\/$/, "");
  const headers = {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
  };

  async function request<T>(table: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${baseUrl}/rest/v1/${table}`, {
      ...init,
      headers: {
        ...headers,
        ...init?.headers,
      },
    });
    if (!response.ok) {
      throw new Error(`Supabase ${table} request failed: ${response.status} ${await response.text()}`);
    }
    const body = await response.text();
    if (!body) {
      return undefined as T;
    }
    return JSON.parse(body) as T;
  }

  async function load() {
    const [users, consents, reminders, events, attempts] = await Promise.all([
      request<SupabaseUser[]>("users?select=*"),
      request<SupabaseConsent[]>("notification_consents?select=*"),
      request<SupabaseReminder[]>("reminders?select=*"),
      request<SupabaseEvent[]>("reminder_events?select=*"),
      request<SupabaseAttempt[]>("send_attempts?select=*"),
    ]);
    data.users = users.map(fromSupabaseUser);
    data.consents = consents.map(fromSupabaseConsent);
    data.reminders = reminders.map(fromSupabaseReminder);
    data.events = events.map(fromSupabaseEvent);
    data.attempts = attempts.map(fromSupabaseAttempt);
  }

  let persistQueue = Promise.resolve();

  async function persistTable<T>(table: string, rows: T[]) {
    if (rows.length === 0) return;
    await request(table, {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(rows),
    });
  }

  function persistAll() {
    persistQueue = persistQueue
      .then(async () => {
        await persistTable("users", data.users.map(toSupabaseUser));
        await persistTable("notification_consents", data.consents.map(toSupabaseConsent));
        await persistTable("reminders", data.reminders.map(toSupabaseReminder));
        await persistTable("reminder_events", data.events.map(toSupabaseEvent));
        await persistTable("send_attempts", data.attempts.map(toSupabaseAttempt));
      })
      .catch((error) => {
        console.error(error);
      });
  }

  return {
    data,
    ready: load().catch((error) => {
      console.error(error);
      console.error("Supabase tables are not ready. Falling back to an empty in-memory store for this server session.");
    }),
    persist: persistAll,
    async close() {
      await persistQueue;
    },
  };
}

interface SupabaseUser {
  id: string;
  toss_user_key: string;
  phone_number: string | null;
  created_at: string;
}

interface SupabaseConsent {
  user_id: string;
  push_enabled: boolean;
  sms_enabled: boolean;
  sms_unsubscribed_at: string | null;
  updated_at: string;
}

interface SupabaseReminder {
  id: string;
  user_id: string;
  title: string;
  allowed_start_hour: number;
  allowed_end_hour: number;
  intensity: Reminder["intensity"];
  randomness: number;
  status: Reminder["status"];
  snoozed_until: string | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseEvent {
  id: string;
  reminder_id: string;
  user_id: string;
  type: ReminderEvent["type"];
  metadata_json: Record<string, unknown>;
  created_at: string;
}

interface SupabaseAttempt {
  id: string;
  reminder_id: string;
  user_id: string;
  channel: SendAttempt["channel"];
  status: SendAttempt["status"];
  reason: string | null;
  provider_message_id: string | null;
  created_at: string;
}

function fromSupabaseUser(row: SupabaseUser): User {
  return {
    id: row.id,
    tossUserKey: row.toss_user_key,
    phoneNumber: row.phone_number,
    createdAt: row.created_at,
  };
}

function toSupabaseUser(row: User): SupabaseUser {
  return {
    id: row.id,
    toss_user_key: row.tossUserKey,
    phone_number: row.phoneNumber,
    created_at: row.createdAt,
  };
}

function fromSupabaseConsent(row: SupabaseConsent): NotificationConsent {
  return {
    userId: row.user_id,
    pushEnabled: row.push_enabled,
    smsEnabled: row.sms_enabled,
    smsUnsubscribedAt: row.sms_unsubscribed_at,
    updatedAt: row.updated_at,
  };
}

function toSupabaseConsent(row: NotificationConsent): SupabaseConsent {
  return {
    user_id: row.userId,
    push_enabled: row.pushEnabled,
    sms_enabled: row.smsEnabled,
    sms_unsubscribed_at: row.smsUnsubscribedAt,
    updated_at: row.updatedAt,
  };
}

function fromSupabaseReminder(row: SupabaseReminder): Reminder {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    allowedStartHour: row.allowed_start_hour,
    allowedEndHour: row.allowed_end_hour,
    intensity: row.intensity,
    randomness: row.randomness ?? 50,
    status: row.status,
    snoozedUntil: row.snoozed_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSupabaseReminder(row: Reminder): SupabaseReminder {
  return {
    id: row.id,
    user_id: row.userId,
    title: row.title,
    allowed_start_hour: row.allowedStartHour,
    allowed_end_hour: row.allowedEndHour,
    intensity: row.intensity,
    randomness: row.randomness,
    status: row.status,
    snoozed_until: row.snoozedUntil,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function fromSupabaseEvent(row: SupabaseEvent): ReminderEvent {
  return {
    id: row.id,
    reminderId: row.reminder_id,
    userId: row.user_id,
    type: row.type,
    metadata: row.metadata_json,
    createdAt: row.created_at,
  };
}

function toSupabaseEvent(row: ReminderEvent): SupabaseEvent {
  return {
    id: row.id,
    reminder_id: row.reminderId,
    user_id: row.userId,
    type: row.type,
    metadata_json: row.metadata,
    created_at: row.createdAt,
  };
}

function fromSupabaseAttempt(row: SupabaseAttempt): SendAttempt {
  return {
    id: row.id,
    reminderId: row.reminder_id,
    userId: row.user_id,
    channel: row.channel,
    status: row.status,
    reason: row.reason,
    providerMessageId: row.provider_message_id,
    createdAt: row.created_at,
  };
}

function toSupabaseAttempt(row: SendAttempt): SupabaseAttempt {
  return {
    id: row.id,
    reminder_id: row.reminderId,
    user_id: row.userId,
    channel: row.channel,
    status: row.status,
    reason: row.reason,
    provider_message_id: row.providerMessageId,
    created_at: row.createdAt,
  };
}
