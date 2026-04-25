import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDb } from "../src/db/client.ts";
import { migrate } from "../src/db/schema.ts";
import { ReminderRepository } from "../src/reminders/repository.ts";

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

    assert.equal(reminder.title, "병원 예약하기");
    assert.equal(repo.listActiveReminders(user.id).length, 1);
    db.close();
  });

  it("records send attempts and inbox events for a user", () => {
    const db = createDb(":memory:");
    migrate(db);
    const repo = new ReminderRepository(db);
    const user = repo.upsertUser({ tossUserKey: "toss-user-2", phoneNumber: "01012345678" });
    const reminder = repo.createReminder({
      userId: user.id,
      title: "보험 청구하기",
      allowedStartHour: 9,
      allowedEndHour: 18,
      intensity: "gentle",
    });

    repo.addSendAttempt({
      reminderId: reminder.id,
      userId: user.id,
      channel: "sms",
      status: "sent",
      reason: "test",
      providerMessageId: "provider-1",
    });
    repo.addEvent({
      reminderId: reminder.id,
      userId: user.id,
      type: "sent",
      metadata: { channel: "sms" },
    });

    const inbox = repo.listInboxForTossUserKey("toss-user-2");
    assert.equal(inbox.attempts.length, 1);
    assert.equal(inbox.events.some((event) => event.type === "sent"), true);
    db.close();
  });
});
