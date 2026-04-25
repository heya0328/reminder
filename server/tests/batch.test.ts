import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runReminderBatch } from "../src/batch/runReminderBatch.ts";
import { buildApp } from "../src/app.ts";
import { createDb } from "../src/db/client.ts";
import { migrate } from "../src/db/schema.ts";
import type { ReminderProvider } from "../src/providers/types.ts";
import { ReminderRepository } from "../src/reminders/repository.ts";

const okProvider: ReminderProvider = {
  async send() {
    return { ok: true, providerMessageId: "log-test-message" };
  },
};

describe("reminder batch", () => {
  it("sends one active reminder through SMS when push is disabled", async () => {
    const db = createDb(":memory:");
    migrate(db);
    const repo = new ReminderRepository(db);
    const user = repo.upsertUser({ tossUserKey: "toss-user-1", phoneNumber: "01012345678" });
    repo.upsertConsent({ userId: user.id, pushEnabled: true, smsEnabled: true });
    const reminder = repo.createReminder({
      userId: user.id,
      title: "자동차 검사 예약",
      allowedStartHour: 9,
      allowedEndHour: 10,
      intensity: "normal",
    });

    const result = await runReminderBatch(repo, {
      now: new Date("2026-04-25T09:00:00+09:00"),
      pushEnabled: false,
      smsEnabled: true,
      pushProvider: okProvider,
      smsProvider: okProvider,
    });

    const inbox = repo.listInboxForTossUserKey("toss-user-1");
    assert.equal(result.attempted, 1);
    assert.equal(inbox.attempts.length, 1);
    assert.equal(inbox.attempts[0]?.reminderId, reminder.id);
    assert.equal(inbox.attempts[0]?.channel, "sms");
    db.close();
  });

  it("protects the batch route with a shared secret", async () => {
    const app = buildApp({ databasePath: ":memory:", batchSecret: "test-secret" });

    const unauthorized = await app.inject({ method: "POST", url: "/api/batch/reminders" });
    assert.equal(unauthorized.statusCode, 401);

    const authorized = await app.inject({
      method: "POST",
      url: "/api/batch/reminders",
      headers: { "x-batch-secret": "test-secret" },
    });
    assert.equal(authorized.statusCode, 200);

    await app.close();
  });
});
