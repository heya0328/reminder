import type { ReminderIntensity } from "../reminders/types.ts";

const TIME_ZONE = "Asia/Seoul";

export function maxDailySendsForIntensity(intensity: ReminderIntensity) {
  if (intensity === "gentle") return 1;
  if (intensity === "normal") return 2;
  return 3;
}

export function hourInSeoul(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  return hour === 24 ? 0 : hour;
}

export function dayInSeoul(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isNightRestricted(date: Date) {
  const hour = hourInSeoul(date);
  return hour >= 21 || hour < 9;
}

export function isInsideAllowedWindow(hour: number, startHour: number, endHour: number) {
  if (startHour === endHour) return true;
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  return hour >= startHour || hour < endHour;
}
