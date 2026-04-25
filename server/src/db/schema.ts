import type { ReminderStore } from "./client.ts";

export function migrate(store: ReminderStore) {
  store.data.users ??= [];
  store.data.consents ??= [];
  store.data.reminders ??= [];
  store.data.events ??= [];
  store.data.attempts ??= [];
  store.persist();
}
