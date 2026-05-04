import type { ReminderRepository } from "../reminders/repository.ts";
import { shouldConsiderReminderNow } from "../policy/schedule.ts";
import type { ReminderProvider } from "../providers/types.ts";

export interface RunReminderBatchOptions {
  now?: Date;
  pushProvider: ReminderProvider;
}

export async function runReminderBatch(repo: ReminderRepository, options: RunReminderBatchOptions) {
  const now = options.now ?? new Date();
  const attempts = [];
  const skipped = [];

  for (const reminder of repo.listActiveRemindersWithUsers()) {
    const sentToday = repo.countSendAttemptsForReminderOnDay(reminder.id, now);
    const schedule = shouldConsiderReminderNow({ reminder, now, sentToday });
    if (!schedule.ok) {
      repo.addEvent({
        reminderId: reminder.id,
        userId: reminder.userId,
        type: "skipped",
        metadata: { reason: schedule.reason },
        createdAt: now.toISOString(),
      });
      skipped.push({ reminderId: reminder.id, reason: schedule.reason });
      continue;
    }

    if (!reminder.pushEnabled) {
      repo.addEvent({
        reminderId: reminder.id,
        userId: reminder.userId,
        type: "skipped",
        metadata: { reason: "push_not_enabled" },
        createdAt: now.toISOString(),
      });
      skipped.push({ reminderId: reminder.id, reason: "push_not_enabled" });
      continue;
    }

    const result = await options.pushProvider.send({
      userId: reminder.tossUserKey,
      reminderId: reminder.id,
      title: reminder.title,
    });
    const attempt = repo.addSendAttempt({
      reminderId: reminder.id,
      userId: reminder.userId,
      channel: "push",
      status: result.ok ? "sent" : "failed",
      reason: result.ok ? "push_sent" : result.errorReason ?? "push_failed",
      providerMessageId: result.providerMessageId,
      createdAt: now.toISOString(),
    });
    repo.addEvent({
      reminderId: reminder.id,
      userId: reminder.userId,
      type: result.ok ? "sent" : "skipped",
      metadata: { channel: "push", sendAttemptId: attempt.id },
      createdAt: now.toISOString(),
    });
    attempts.push(attempt);
  }

  return { attempted: attempts.length, skipped: skipped.length, attempts, skippedReasons: skipped };
}
