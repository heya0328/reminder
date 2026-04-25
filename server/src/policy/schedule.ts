import type { ReminderWithUser } from "../reminders/types.ts";
import { dayInSeoul, hourInSeoul, isInsideAllowedWindow, isNightRestricted, maxDailySendsForIntensity } from "./limits.ts";
import { seededRandomInt } from "./random.ts";

export function shouldConsiderReminderNow(input: { reminder: ReminderWithUser; now: Date; sentToday: number }) {
  const { reminder, now, sentToday } = input;
  if (reminder.snoozedUntil && new Date(reminder.snoozedUntil) > now) {
    return { ok: false, reason: "snoozed" };
  }
  if (isNightRestricted(now)) {
    return { ok: false, reason: "night_restricted" };
  }
  const hour = hourInSeoul(now);
  if (!isInsideAllowedWindow(hour, reminder.allowedStartHour, reminder.allowedEndHour)) {
    return { ok: false, reason: "outside_allowed_window" };
  }
  const maxDailySends = maxDailySendsForIntensity(reminder.intensity);
  if (sentToday >= maxDailySends) {
    return { ok: false, reason: "daily_cap_reached" };
  }
  const candidateHour = seededRandomInt(`${reminder.id}:${dayInSeoul(now)}:${sentToday}`, reminder.allowedStartHour, reminder.allowedEndHour);
  if (hour !== candidateHour) {
    return { ok: false, reason: "not_candidate_hour" };
  }
  return { ok: true, reason: "candidate_hour" };
}
