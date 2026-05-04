import type { CreateReminderInput, Reminder } from "../../types/reminder";
import { supabaseDelete, supabaseGet, supabasePatch, supabasePost } from "./supabase";

interface SupabaseReminder {
  id: string;
  user_id: string;
  title: string;
  allowed_start_hour: number;
  allowed_end_hour: number;
  intensity: string;
  randomness: number;
  status: string;
  snoozed_until: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseUser {
  id: string;
  toss_user_key: string;
}

function toReminder(row: SupabaseReminder): Reminder {
  return {
    id: row.id,
    title: row.title,
    allowedStartHour: row.allowed_start_hour,
    allowedEndHour: row.allowed_end_hour,
    intensity: row.intensity as Reminder["intensity"],
    randomness: row.randomness ?? 50,
    status: row.status as Reminder["status"],
    snoozedUntil: row.snoozed_until,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

function uuidv4() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function genId(prefix: string) {
  return `${prefix}_${uuidv4()}`;
}

export async function ensureUser(tossUserKey: string): Promise<string> {
  // 기존 유저 조회
  const existing = await supabaseGet<SupabaseUser[]>(
    "users",
    `toss_user_key=eq.${encodeURIComponent(tossUserKey)}&select=id`,
  );
  if (existing.length > 0) return existing[0].id;

  // 새 유저 생성
  const userId = genId("user");
  await supabasePost("users", {
    id: userId,
    toss_user_key: tossUserKey,
    phone_number: null,
    created_at: new Date().toISOString(),
  });
  await supabasePost("notification_consents", {
    user_id: userId,
    push_enabled: false,
    push_consented_at: null,
    sms_enabled: false,
    sms_unsubscribed_at: null,
    updated_at: new Date().toISOString(),
  });
  return userId;
}

export async function createReminder(input: CreateReminderInput): Promise<Reminder> {
  const userId = await ensureUser(input.tossUserKey);
  const now = new Date().toISOString();
  const id = genId("rem");

  const rows = await supabasePost<SupabaseReminder[]>("reminders", {
    id,
    user_id: userId,
    title: input.title,
    allowed_start_hour: input.allowedStartHour,
    allowed_end_hour: input.allowedEndHour,
    intensity: input.intensity,
    randomness: input.randomness,
    status: "active",
    snoozed_until: null,
    created_at: now,
    updated_at: now,
  });

  return toReminder(rows[0]);
}

export async function listReminders(tossUserKey: string): Promise<Reminder[]> {
  // 유저 ID 조회
  const users = await supabaseGet<SupabaseUser[]>(
    "users",
    `toss_user_key=eq.${encodeURIComponent(tossUserKey)}&select=id`,
  );
  if (users.length === 0) return [];

  const userId = users[0].id;
  const rows = await supabaseGet<SupabaseReminder[]>(
    "reminders",
    `user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc`,
  );
  return rows.map(toReminder);
}

export async function updateReminder(id: string, input: { title?: string; intensity?: string; randomness?: number }): Promise<Reminder> {
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title != null) body.title = input.title;
  if (input.intensity != null) body.intensity = input.intensity;
  if (input.randomness != null) body.randomness = input.randomness;

  const rows = await supabasePatch<SupabaseReminder[]>(
    "reminders",
    `id=eq.${encodeURIComponent(id)}`,
    body,
  );
  return toReminder(rows[0]);
}

export async function completeReminder(id: string): Promise<Reminder> {
  const now = new Date().toISOString();
  const rows = await supabasePatch<SupabaseReminder[]>(
    "reminders",
    `id=eq.${encodeURIComponent(id)}`,
    { status: "completed", completed_at: now, updated_at: now },
  );
  return toReminder(rows[0]);
}

export async function deleteReminder(id: string): Promise<void> {
  await supabaseDelete("reminders", `id=eq.${encodeURIComponent(id)}`);
}

export async function snoozeReminder(id: string): Promise<Reminder> {
  // 현재 상태 확인
  const current = await supabaseGet<SupabaseReminder[]>(
    "reminders",
    `id=eq.${encodeURIComponent(id)}&select=snoozed_until`,
  );

  const isCurrentlySnoozed = current[0]?.snoozed_until && new Date(current[0].snoozed_until) > new Date();

  let snoozedUntil: string | null;
  if (isCurrentlySnoozed) {
    snoozedUntil = null;
  } else {
    // 오늘 KST 23:59:59까지
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(now.getTime() + kstOffset);
    const endOfDayKST = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate(), 23, 59, 59, 999));
    snoozedUntil = new Date(endOfDayKST.getTime() - kstOffset).toISOString();
  }

  const rows = await supabasePatch<SupabaseReminder[]>(
    "reminders",
    `id=eq.${encodeURIComponent(id)}`,
    { snoozed_until: snoozedUntil, updated_at: new Date().toISOString() },
  );
  return toReminder(rows[0]);
}
