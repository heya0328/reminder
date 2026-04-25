import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildApp } from "../src/app.ts";

describe("reminder API", () => {
  it("creates and lists a reminder", async () => {
    const app = buildApp({ databasePath: ":memory:" });

    const create = await app.inject({
      method: "POST",
      url: "/api/reminders",
      payload: {
        tossUserKey: "toss-user-1",
        phoneNumber: "01012345678",
        smsEnabled: true,
        title: "구독 해지하기",
        allowedStartHour: 9,
        allowedEndHour: 18,
        intensity: "normal",
      },
    });

    assert.equal(create.statusCode, 201);

    const list = await app.inject({
      method: "GET",
      url: "/api/reminders?tossUserKey=toss-user-1",
    });

    assert.equal(list.statusCode, 200);
    assert.equal(list.json().reminders.length, 1);

    await app.close();
  });

  it("completes and snoozes reminders", async () => {
    const app = buildApp({ databasePath: ":memory:" });
    const create = await app.inject({
      method: "POST",
      url: "/api/reminders",
      payload: {
        tossUserKey: "toss-user-2",
        title: "서류 제출하기",
        smsEnabled: false,
        allowedStartHour: 9,
        allowedEndHour: 18,
        intensity: "gentle",
      },
    });
    const reminderId = create.json().reminder.id;

    const snooze = await app.inject({
      method: "POST",
      url: `/api/reminders/${reminderId}/snooze`,
      payload: { hours: 2 },
    });
    assert.equal(snooze.statusCode, 200);
    assert.equal(typeof snooze.json().reminder.snoozedUntil, "string");

    const complete = await app.inject({
      method: "POST",
      url: `/api/reminders/${reminderId}/complete`,
    });
    assert.equal(complete.statusCode, 200);
    assert.equal(complete.json().reminder.status, "completed");

    await app.close();
  });

  it("manages SMS consent and unsubscribe", async () => {
    const app = buildApp({ databasePath: ":memory:" });

    const consent = await app.inject({
      method: "POST",
      url: "/api/consents/sms",
      payload: {
        tossUserKey: "toss-user-3",
        phoneNumber: "01012345678",
        smsEnabled: true,
      },
    });
    assert.equal(consent.statusCode, 200);
    assert.equal(consent.json().consent.smsEnabled, true);

    const unsubscribe = await app.inject({
      method: "POST",
      url: "/api/consents/sms/unsubscribe",
      payload: { tossUserKey: "toss-user-3" },
    });
    assert.equal(unsubscribe.statusCode, 200);
    assert.equal(unsubscribe.json().consent.smsEnabled, false);
    assert.equal(typeof unsubscribe.json().consent.smsUnsubscribedAt, "string");

    await app.close();
  });
});
