import { useCallback, useEffect, useState } from "react";

import {
  completeReminder,
  createReminder,
  deleteReminder,
  listReminders,
  snoozeReminder,
  updateReminder,
} from "../lib/api/reminders";
import type { CreateReminderInput, Reminder } from "../types/reminder";

export function useReminders(tossUserKey: string | null) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tossUserKey) return;
    setLoading(true);
    setError(null);

    try {
      const nextReminders = await listReminders(tossUserKey);
      setReminders(nextReminders);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "리마인더를 불러오지 못했어요.",
      );
    } finally {
      setLoading(false);
    }
  }, [tossUserKey]);

  const create = useCallback(
    async (input: Omit<CreateReminderInput, "tossUserKey">) => {
      if (!tossUserKey) throw new Error("로그인이 필요해요.");
      setError(null);
      const reminder = await createReminder({ ...input, tossUserKey });
      setReminders((current) => [reminder, ...current]);
      return reminder;
    },
    [tossUserKey],
  );

  const update = useCallback(async (id: string, input: { title?: string; intensity?: string; randomness?: number }) => {
    setError(null);
    const reminder = await updateReminder(id, input);
    setReminders((current) =>
      current.map((item) => (item.id === id ? reminder : item)),
    );
    return reminder;
  }, []);

  const complete = useCallback(async (id: string) => {
    setError(null);
    const reminder = await completeReminder(id);
    setReminders((current) =>
      current.map((item) => (item.id === id ? reminder : item)),
    );
    return reminder;
  }, []);

  const remove = useCallback(async (id: string) => {
    setError(null);
    await deleteReminder(id);
    setReminders((current) => current.filter((item) => item.id !== id));
  }, []);

  const snooze = useCallback(async (id: string) => {
    setError(null);
    const reminder = await snoozeReminder(id);
    setReminders((current) =>
      current.map((item) => (item.id === id ? reminder : item)),
    );
    return reminder;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    reminders,
    loading,
    error,
    refresh,
    create,
    update,
    complete,
    snooze,
    remove,
  };
}
