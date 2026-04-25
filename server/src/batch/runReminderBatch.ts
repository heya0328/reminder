import type { ReminderRepository } from "../reminders/repository.ts";
import { chooseChannel } from "../policy/channel.ts";
import { shouldConsiderReminderNow } from "../policy/schedule.ts";
import type { ReminderProvider } from "../providers/types.ts";

export interface RunReminderBatchOptions {
  now?: Date;
  pushEnabled?: boolean;
  smsEnabled?: boolean;
  pushProvider: ReminderProvider;
  smsProvider: ReminderProvider;
}

export async function runReminderBatch(repo: ReminderRepository, options: RunReminderBatchOptions) {
  const now = options.now ?? new Date();
  const pushGloballyEnabled = options.pushEnabled ?? true;
  const smsGloballyEnabled = options.smsEnabled ?? true;
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

    const smsEligible = smsGloballyEnabled && reminder.smsEnabled && !reminder.smsUnsubscribedAt && Boolean(reminder.phoneNumber);
    const channelChoice = chooseChannel({
      pushEligible: pushGloballyEnabled && reminder.pushEnabled,
      smsEligible,
    });

    if (!channelChoice.channel) {
      repo.addEvent({
        reminderId: reminder.id,
        userId: reminder.userId,
        type: "skipped",
        metadata: { reason: channelChoice.reason },
        createdAt: now.toISOString(),
      });
      skipped.push({ reminderId: reminder.id, reason: channelChoice.reason });
      continue;
    }

    const provider = channelChoice.channel === "push" ? options.pushProvider : options.smsProvider;
    const result = await provider.send({
      userId: reminder.userId,
      reminderId: reminder.id,
      title: reminder.title,
    });
    const attempt = repo.addSendAttempt({
      reminderId: reminder.id,
      userId: reminder.userId,
      channel: channelChoice.channel,
      status: result.ok ? "sent" : "failed",
      reason: result.ok ? channelChoice.reason : result.errorReason ?? channelChoice.reason,
      providerMessageId: result.providerMessageId,
      createdAt: now.toISOString(),
    });
    repo.addEvent({
      reminderId: reminder.id,
      userId: reminder.userId,
      type: result.ok ? "sent" : "skipped",
      metadata: { channel: channelChoice.channel, sendAttemptId: attempt.id },
      createdAt: now.toISOString(),
    });
    attempts.push(attempt);
  }

  return { attempted: attempts.length, skipped: skipped.length, attempts, skippedReasons: skipped };
}
