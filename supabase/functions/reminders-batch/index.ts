// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { dayInSeoul, shouldConsiderReminderNow, type ReminderForSchedule } from "../_shared/policy.ts";
import { callTossPush, createTossHttpClient } from "../_shared/tossPush.ts";

interface ReminderRow {
  id: string;
  user_id: string;
  title: string;
  status: string;
  randomness: number | null;
  intensity: "gentle" | "normal" | "strong";
  allowed_start_hour: number;
  allowed_end_hour: number;
  snoozed_until: string | null;
  created_at: string;
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return jsonResponse(405, { error: "method_not_allowed" });

  const expectedSecret = Deno.env.get("BATCH_SECRET");
  const providedSecret = req.headers.get("x-batch-secret") ?? "";
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return jsonResponse(401, { error: "unauthorized_batch_request" });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const now = new Date();
  const todayStr = dayInSeoul(now);

  const { data: reminders, error: remErr } = await supabase
    .from("reminders")
    .select("id, user_id, title, status, randomness, intensity, allowed_start_hour, allowed_end_hour, snoozed_until, created_at")
    .eq("status", "active");
  if (remErr) return jsonResponse(500, { error: "db_reminder_error", detail: remErr.message });
  const activeReminders = (reminders ?? []) as ReminderRow[];

  if (activeReminders.length === 0) {
    return jsonResponse(200, { attempted: 0, skipped: 0, attempts: [], skippedReasons: [] });
  }

  const userIds = Array.from(new Set(activeReminders.map((r) => r.user_id)));
  const [{ data: users }, { data: consents }] = await Promise.all([
    supabase.from("users").select("id, toss_user_key").in("id", userIds),
    supabase.from("notification_consents").select("user_id, push_enabled").in("user_id", userIds),
  ]);
  const userMap = new Map<string, string>();
  for (const u of (users ?? []) as Array<{ id: string; toss_user_key: string }>) userMap.set(u.id, u.toss_user_key);
  const consentMap = new Map<string, boolean>();
  for (const c of (consents ?? []) as Array<{ user_id: string; push_enabled: boolean }>) consentMap.set(c.user_id, c.push_enabled);

  const reminderIds = activeReminders.map((r) => r.id);
  const { data: todayAttempts } = await supabase
    .from("send_attempts")
    .select("reminder_id, status, created_at")
    .in("reminder_id", reminderIds)
    .gte("created_at", `${todayStr}T00:00:00+09:00`)
    .lte("created_at", `${todayStr}T23:59:59+09:00`)
    .eq("status", "sent");
  const sentTodayMap = new Map<string, number>();
  for (const a of (todayAttempts ?? []) as Array<{ reminder_id: string }>) {
    sentTodayMap.set(a.reminder_id, (sentTodayMap.get(a.reminder_id) ?? 0) + 1);
  }

  const templateSetCode = Deno.env.get("TOSS_PUSH_TEMPLATE_SET_CODE")!;
  const httpClient = createTossHttpClient();

  const attempts: any[] = [];
  const skipped: any[] = [];
  const eventInserts: any[] = [];
  const attemptInserts: any[] = [];

  try {
    for (const r of activeReminders) {
      const tossUserKey = userMap.get(r.user_id);
      const pushEnabled = consentMap.get(r.user_id) ?? false;
      const sentToday = sentTodayMap.get(r.id) ?? 0;
      const reminderForSchedule: ReminderForSchedule = {
        id: r.id,
        randomness: r.randomness,
        intensity: r.intensity,
        allowedStartHour: r.allowed_start_hour,
        allowedEndHour: r.allowed_end_hour,
        snoozedUntil: r.snoozed_until,
        createdAt: r.created_at,
      };
      const decision = await shouldConsiderReminderNow({ reminder: reminderForSchedule, now, sentToday });

      if (!decision.ok) {
        skipped.push({ reminderId: r.id, reason: decision.reason });
        eventInserts.push({
          id: `event_${crypto.randomUUID()}`,
          reminder_id: r.id,
          user_id: r.user_id,
          type: "skipped",
          metadata_json: { reason: decision.reason },
          created_at: now.toISOString(),
        });
        continue;
      }
      if (!pushEnabled || !tossUserKey) {
        skipped.push({ reminderId: r.id, reason: "push_not_enabled" });
        eventInserts.push({
          id: `event_${crypto.randomUUID()}`,
          reminder_id: r.id,
          user_id: r.user_id,
          type: "skipped",
          metadata_json: { reason: "push_not_enabled" },
          created_at: now.toISOString(),
        });
        continue;
      }

      const result = await callTossPush({ tossUserKey, templateSetCode, client: httpClient });
      const attemptId = `send_${crypto.randomUUID()}`;
      attemptInserts.push({
        id: attemptId,
        reminder_id: r.id,
        user_id: r.user_id,
        channel: "push",
        status: result.ok ? "sent" : "failed",
        reason: result.ok ? "push_sent" : (result.errorReason ?? "push_failed"),
        provider_message_id: result.providerMessageId ?? null,
        created_at: now.toISOString(),
      });
      eventInserts.push({
        id: `event_${crypto.randomUUID()}`,
        reminder_id: r.id,
        user_id: r.user_id,
        type: result.ok ? "sent" : "skipped",
        metadata_json: { channel: "push", sendAttemptId: attemptId },
        created_at: now.toISOString(),
      });
      attempts.push({ reminderId: r.id, ok: result.ok, attemptId, errorReason: result.errorReason });
    }
  } finally {
    httpClient.close();
  }

  if (attemptInserts.length > 0) await supabase.from("send_attempts").insert(attemptInserts);
  if (eventInserts.length > 0) await supabase.from("reminder_events").insert(eventInserts);

  return jsonResponse(200, {
    attempted: attempts.length,
    skipped: skipped.length,
    attempts,
    skippedReasons: skipped,
  });
});
