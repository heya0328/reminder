import type { ReminderWithUser } from "../reminders/types.ts";
import { dayInSeoul, hourInSeoul, isInsideAllowedWindow, isNightRestricted, maxDailySendsForIntensity, spreadDaysForRandomness } from "./limits.ts";
import { seededRandomInt } from "./random.ts";

/**
 * 배치 실행 시 각 리마인더의 발송 여부를 판단한다.
 *
 * randomness(0~100)에 따라 발송이 분산되는 기간이 달라진다:
 * - 0 → 오늘(1일) 안에 확정적으로 발송
 * - 50 → 3일 안에 랜덤 발송
 * - 100 → 5일 안에 가장 불규칙하게 발송
 *
 * 먼저 seed 기반으로 "생성일로부터 며칠째에 보낼지"를 결정하고,
 * 해당일이 오늘이면 "몇 시에 보낼지"를 결정한다.
 */
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

  // randomness 기반: 발송 분산 기간 내에서 오늘이 발송일인지 결정
  const spreadDays = spreadDaysForRandomness(reminder.randomness ?? 50);
  if (spreadDays > 1) {
    const createdDay = reminder.createdAt.slice(0, 10);
    const todayStr = dayInSeoul(now);
    const daysSinceCreated = Math.floor((new Date(todayStr).getTime() - new Date(createdDay).getTime()) / (24 * 60 * 60 * 1000));
    const cycleDayIndex = daysSinceCreated % spreadDays;
    const candidateDay = seededRandomInt(`${reminder.id}:day:${Math.floor(daysSinceCreated / spreadDays)}`, 0, spreadDays);
    if (cycleDayIndex !== candidateDay) {
      return { ok: false, reason: "not_candidate_day" };
    }
  }

  const candidateHour = seededRandomInt(`${reminder.id}:${dayInSeoul(now)}:${sentToday}`, reminder.allowedStartHour, reminder.allowedEndHour);
  if (hour !== candidateHour) {
    return { ok: false, reason: "not_candidate_hour" };
  }
  return { ok: true, reason: "candidate_hour" };
}
