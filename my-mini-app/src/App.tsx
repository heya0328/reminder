import { ConfirmDialog, useToast } from "@toss/tds-mobile";
import { useCallback, useMemo, useState } from "react";

import "./App.css";
import { useAuth } from "./hooks/useAuth";
import { useBackHandler } from "./hooks/useBackHandler";
import { useDeepLink } from "./hooks/useDeepLink";
import { useFullScreenAd } from "./hooks/useFullScreenAd";
import { useNotificationConsent } from "./hooks/useNotificationConsent";
import { useReminders } from "./hooks/useReminders";
import { useRouter } from "./hooks/useRouter";
import { CreateReminderPage } from "./pages/CreateReminderPage";
import { HomePage } from "./pages/HomePage";
import { InboxPage } from "./pages/InboxPage";
import { ReminderDetailPage } from "./pages/ReminderDetailPage";
import { ReminderListPage } from "./pages/ReminderListPage";

function exitApp() {
  import("@apps-in-toss/web-bridge")
    .then(({ closeView }) => closeView())
    .catch(() => {
      // 로컬 개발 환경
    });
}

function App() {
  const router = useRouter();
  const auth = useAuth();
  const reminders = useReminders(auth.userKey);
  const consent = useNotificationConsent(auth.userKey);
  const ad = useFullScreenAd();
  const { openToast } = useToast();
  const [exitDialogOpen, setExitDialogOpen] = useState(false);

  const showSuccessToast = useCallback(
    (text: string) => {
      void openToast(text, {
        type: "bottom",
        lottie: "https://static.toss.im/lotties-common/check-green-spot.json",
        higherThanCTA: true,
      });
    },
    [openToast],
  );

  const showErrorToast = useCallback(
    (text: string) => {
      void openToast(text, {
        type: "bottom",
        higherThanCTA: true,
      });
    },
    [openToast],
  );

  // 딥링크 처리: 푸시 알림 탭 시 해당 경로로 이동
  const handleDeepLink = useCallback(
    async (path: string) => {
      if (!auth.isLoggedIn) {
        const userKey = await auth.login();
        if (userKey) {
          router.navigate(path);
        }
        return;
      }
      router.navigate(path);
    },
    [auth, router],
  );
  useDeepLink(handleDeepLink);

  const selectedReminder = useMemo(
    () =>
      reminders.reminders.find(
        (reminder) => reminder.id === router.route.params.id,
      ),
    [reminders.reminders, router.route.params.id],
  );

  function openDetail(id: string) {
    router.navigate(`/detail/${id}`);
  }

  async function handleCreate() {
    if (!auth.isLoggedIn) {
      const userKey = await auth.login();
      if (userKey) {
        router.navigate("/create");
      }
      return;
    }
    router.navigate("/create");
  }

  // 네이티브 뒤로가기 버튼 처리
  useBackHandler({
    page: router.route.page,
    onBack: () => router.back(),
    onExit: () => setExitDialogOpen(true),
  });

  const { page } = router.route;

  // auth 또는 reminders 로딩 중이면 홈에서 빈 화면 방지
  if (page === "home" && (auth.loading || reminders.loading)) {
    return <main className="app-page" />;
  }

  let pageContent;

  if (page === "create") {
    pageContent = (
      <CreateReminderPage
        error={reminders.error}
        hasConsented={consent.hasConsented}
        consentLoading={consent.loading}
        onRequestConsent={consent.consent}
        onConsentError={showErrorToast}
        onBack={() => router.back()}
        onCreated={() => ad.showAd(() => {
          router.navigate("/");
          showSuccessToast("일정을 추가했어요.");
        })}
        onCreate={reminders.create}
      />
    );
  } else if (page === "list") {
    pageContent = (
      <ReminderListPage
        reminders={reminders.reminders}
        loading={reminders.loading}
        error={reminders.error}
        onBack={() => router.back()}
        onCreate={handleCreate}
        onRefresh={reminders.refresh}
        onOpenDetail={openDetail}
      />
    );
  } else if (page === "inbox") {
    pageContent = (
      <InboxPage
        reminders={reminders.reminders}
        onBack={() => router.back()}
        onOpenDetail={openDetail}
      />
    );
  } else if (page === "detail") {
    pageContent = (
      <ReminderDetailPage
        reminder={selectedReminder}
        onBack={() => router.back()}
        onSaved={() => ad.showAd(() => {
          router.navigate("/");
          showSuccessToast("일정을 수정했어요.");
        })}
        onUpdate={async (id, input) => {
          await reminders.update(id, input);
        }}
      />
    );
  } else {
    pageContent = (
      <HomePage
        reminders={reminders.reminders}
        userKey={auth.userKey}
        onCreate={handleCreate}
        onOpenDetail={openDetail}
        onComplete={async (id) => {
          await reminders.complete(id);
        }}
        onSnooze={async (id) => {
          await reminders.snooze(id);
        }}
        onDelete={async (id) => {
          await reminders.remove(id);
        }}
      />
    );
  }

  return (
    <>
      {pageContent}
      <ConfirmDialog
        open={exitDialogOpen}
        onClose={() => setExitDialogOpen(false)}
        title="앱을 종료할까요?"
        confirmButton={
          <ConfirmDialog.ConfirmButton size="large" onClick={exitApp}>
            종료
          </ConfirmDialog.ConfirmButton>
        }
        cancelButton={
          <ConfirmDialog.CancelButton size="large" onClick={() => setExitDialogOpen(false)}>
            취소
          </ConfirmDialog.CancelButton>
        }
      />
    </>
  );
}

export default App;
