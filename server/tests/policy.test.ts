import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chooseChannel } from "../src/policy/channel.ts";
import { isInsideAllowedWindow, isNightRestricted, maxDailySendsForIntensity } from "../src/policy/limits.ts";
import { seededRandomInt } from "../src/policy/random.ts";
import { shouldConsiderReminderNow } from "../src/policy/schedule.ts";
import type { ReminderWithUser } from "../src/reminders/types.ts";

describe("random reminder policy", () => {
  it("maps intensity to daily candidate send counts", () => {
    assert.equal(maxDailySendsForIntensity("gentle"), 1);
    assert.equal(maxDailySendsForIntensity("normal"), 2);
    assert.equal(maxDailySendsForIntensity("strong"), 3);
  });

  it("blocks night sends", () => {
    assert.equal(isNightRestricted(new Date("2026-04-25T12:00:00+09:00")), false);
    assert.equal(isNightRestricted(new Date("2026-04-25T22:00:00+09:00")), true);
  });

  it("checks allowed user windows", () => {
    assert.equal(isInsideAllowedWindow(10, 9, 18), true);
    assert.equal(isInsideAllowedWindow(20, 9, 18), false);
  });

  it("uses deterministic seeded random integers", () => {
    assert.equal(seededRandomInt("reminder-1:2026-04-25", 0, 10), seededRandomInt("reminder-1:2026-04-25", 0, 10));
  });

  it("chooses push before SMS when push is available", () => {
    assert.deepEqual(chooseChannel({ pushEligible: true, smsEligible: true }), { channel: "push", reason: "push_eligible" });
  });

  it("uses SMS when push is unavailable and SMS is eligible", () => {
    assert.deepEqual(chooseChannel({ pushEligible: false, smsEligible: true }), { channel: "sms", reason: "push_unavailable_sms_eligible" });
  });

  it("skips snoozed reminders", () => {
    const reminder: ReminderWithUser = {
      id: "reminder-1",
      userId: "user-1",
      tossUserKey: "toss-user-1",
      phoneNumber: "01012345678",
      title: "신분증 재발급",
      allowedStartHour: 9,
      allowedEndHour: 10,
      intensity: "gentle",
      status: "active",
      snoozedUntil: "2026-04-25T03:00:00.000Z",
      createdAt: "2026-04-24T00:00:00.000Z",
      updatedAt: "2026-04-24T00:00:00.000Z",
      pushEnabled: true,
      smsEnabled: true,
      smsUnsubscribedAt: null,
    };

    assert.deepEqual(shouldConsiderReminderNow({ reminder, now: new Date("2026-04-25T09:00:00+09:00"), sentToday: 0 }), {
      ok: false,
      reason: "snoozed",
    });
  });
});
