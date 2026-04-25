import { useCallback, useEffect, useState } from "react";

import {
  completeReminder,
  createReminder,
  listReminders,
  snoozeReminder,
} from "../lib/api/reminders";
import type { CreateReminderInput, Reminder } from "../types/reminder";

export function useReminders(tossUserKey: string) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
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
      setError(null);
      const reminder = await createReminder({ ...input, tossUserKey });
      setReminders((current) => [reminder, ...current]);
      return reminder;
    },
    [tossUserKey],
  );

  const complete = useCallback(async (id: string) => {
    setError(null);
    const reminder = await completeReminder(id);
    setReminders((current) =>
      current.map((item) => (item.id === id ? reminder : item)),
    );
    return reminder;
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
    complete,
    snooze,
  };
}
