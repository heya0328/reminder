import type { ReminderProvider } from "../providers/types.ts";
import type { ReminderRepository } from "../reminders/repository.ts";

export interface SendNowRandomInput {
  tossUserKey: string;
  now?: Date;
}

export interface SendNowRandomResult {
  ok: boolean;
  reason?: string;
  pickedReminderId?: string;
  pickedTitle?: string;
  totalCandidates?: number;
  attemptId?: string;
  providerMessageId?: string;
  errorReason?: string;
}

export async function sendNowRandom(
  repo: ReminderRepository,
  pushProvider: ReminderProvider,
  input: SendNowRandomInput,
): Promise<SendNowRandomResult> {
  const now = input.now ?? new Date();
  const user = repo.findUserByTossUserKey(input.tossUserKey);
  if (!user) return { ok: false, reason: "user_not_found" };

  const consent = repo.getConsent(user.id);
  if (!consent?.pushEnabled) return { ok: false, reason: "push_not_enabled" };

  const candidates = repo.listActiveReminders(user.id);
  if (candidates.length === 0) return { ok: false, reason: "no_active_reminders" };

  const picked = candidates[Math.floor(Math.random() * candidates.length)];

  const result = await pushProvider.send({
    userId: input.tossUserKey,
    reminderId: picked.id,
    title: picked.title,
  });

  const attempt = repo.addSendAttempt({
    reminderId: picked.id,
    userId: user.id,
    channel: "push",
    status: result.ok ? "sent" : "failed",
    reason: result.ok ? "manual_send_now_random" : result.errorReason ?? "push_failed",
    providerMessageId: result.providerMessageId,
    createdAt: now.toISOString(),
  });
  repo.addEvent({
    reminderId: picked.id,
    userId: user.id,
    type: result.ok ? "sent" : "skipped",
    metadata: { channel: "push", sendAttemptId: attempt.id, trigger: "manual_send_now_random" },
    createdAt: now.toISOString(),
  });

  return {
    ok: result.ok,
    pickedReminderId: picked.id,
    pickedTitle: picked.title,
    totalCandidates: candidates.length,
    attemptId: attempt.id,
    providerMessageId: result.providerMessageId,
    errorReason: result.errorReason,
  };
}
