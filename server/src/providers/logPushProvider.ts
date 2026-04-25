import crypto from "node:crypto";
import type { ReminderProvider } from "./types.ts";

export class LogPushProvider implements ReminderProvider {
  async send(input: { userId: string; reminderId: string; title: string }) {
    const providerMessageId = `log-push-${crypto.randomUUID()}`;
    console.info("[random-reminder:push]", {
      providerMessageId,
      userId: input.userId,
      reminderId: input.reminderId,
      message: input.title,
    });
    return { ok: true, providerMessageId };
  }
}
