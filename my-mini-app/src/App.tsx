import { useMemo, useState } from "react";

import "./App.css";
import { useReminders } from "./hooks/useReminders";
import { CreateReminderPage } from "./pages/CreateReminderPage";
import { HomePage } from "./pages/HomePage";
import { InboxPage } from "./pages/InboxPage";
import { ReminderDetailPage } from "./pages/ReminderDetailPage";
import { ReminderListPage } from "./pages/ReminderListPage";

type Page = "home" | "create" | "list" | "inbox" | "detail";

// TODO: Production must replace this with an approved Apps in Toss user identity.
const DEV_TOSS_USER_KEY = "local-dev-user";

function App() {
  const [page, setPage] = useState<Page>("home");
  const [selectedReminderId, setSelectedReminderId] = useState<string | null>(
    null,
  );
  const reminders = useReminders(DEV_TOSS_USER_KEY);

  const activeCount = useMemo(
    () =>
      reminders.reminders.filter((reminder) => reminder.status === "active")
        .length,
    [reminders.reminders],
  );

  const selectedReminder = useMemo(
    () =>
      reminders.reminders.find((reminder) => reminder.id === selectedReminderId),
    [reminders.reminders, selectedReminderId],
  );

  function openDetail(id: string) {
    setSelectedReminderId(id);
    setPage("detail");
  }

  if (page === "create") {
    return (
      <CreateReminderPage
        error={reminders.error}
        onBack={() => setPage("home")}
        onCreated={() => setPage("list")}
        onCreate={reminders.create}
      />
    );
  }

  if (page === "list") {
    return (
      <ReminderListPage
        reminders={reminders.reminders}
        loading={reminders.loading}
        error={reminders.error}
        onBack={() => setPage("home")}
        onCreate={() => setPage("create")}
        onRefresh={reminders.refresh}
        onOpenDetail={openDetail}
      />
    );
  }

  if (page === "inbox") {
    return (
      <InboxPage
        reminders={reminders.reminders}
        onBack={() => setPage("home")}
        onOpenDetail={openDetail}
      />
    );
  }

  if (page === "detail") {
    return (
      <ReminderDetailPage
        reminder={selectedReminder}
        onBack={() => setPage("list")}
        onComplete={async (id) => {
          await reminders.complete(id);
        }}
        onSnooze={async (id) => {
          await reminders.snooze(id);
        }}
      />
    );
  }

  return (
    <HomePage
      activeCount={activeCount}
      onCreate={() => setPage("create")}
      onOpenList={() => setPage("list")}
      onOpenInbox={() => setPage("inbox")}
    />
  );
}

export default App;
