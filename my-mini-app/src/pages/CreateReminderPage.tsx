import { adaptive } from "@toss/tds-colors";
import {
  FixedBottomCTA,
  SegmentedControl,
  Slider,
  Spacing,
  Text,
  TextArea,
} from "@toss/tds-mobile";
import { useEffect, useRef, useState } from "react";

import { NotificationConsentDialog } from "../components/NotificationConsentDialog";
import type { CreateReminderInput, ReminderIntensity } from "../types/reminder";

interface CreateReminderPageProps {
  error: string | null;
  hasConsented: boolean;
  consentLoading: boolean;
  onBack: () => void;
  onCreated: () => void;
  onCreate: (input: Omit<CreateReminderInput, "tossUserKey">) => Promise<void>;
  onRequestConsent: () => Promise<void>;
  onConsentError: (message: string) => void;
}

type Priority = "simple" | "normal" | "important";

const priorityToIntensity: Record<Priority, ReminderIntensity> = {
  simple: "gentle",
  normal: "normal",
  important: "strong",
};

const priorityDescriptions: Record<Priority, string> = {
  simple: "가볍게 떠올리면 되는 일",
  normal: "급하지는 않지만 잊으면 안 되는 일",
  important: "잊으면 곤란한 중요한 일",
};

const priorityDefaultRandomness: Record<Priority, number> = {
  simple: 100,
  normal: 50,
  important: 0,
};

const randomReminderDescriptions = [
  { value: 0, text: "오늘 안에 한 번 확실히 알려드릴게요" },
  { value: 25, text: "내일 안에 한 번 다시 떠올려드릴게요" },
  { value: 50, text: "3일 안에 예측하기 어렵게 알려드릴게요" },
  { value: 75, text: "4일 안에 더 불규칙하게 떠올려드릴게요" },
  { value: 100, text: "5일 안에 가장 예상 못 한 순간 알려드릴게요" },
];

export function CreateReminderPage({
  error,
  hasConsented,
  consentLoading,
  onCreated,
  onCreate,
  onRequestConsent,
  onConsentError,
}: CreateReminderPageProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [randomness, setRandomness] = useState(50);
  const [randomnessTouched, setRandomnessTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);
  const [consentSubmitting, setConsentSubmitting] = useState(false);
  const pendingPayloadRef = useRef<Omit<CreateReminderInput, "tossUserKey"> | null>(null);

  useEffect(() => {
    // 오토포커스
    setTimeout(() => textAreaRef.current?.focus(), 300);

    // 키보드 감지: visualViewport resize
    const vv = window.visualViewport;
    if (!vv) return;
    function handleResize() {
      const threshold = window.innerHeight * 0.75;
      setKeyboardOpen((vv?.height ?? window.innerHeight) < threshold);
    }
    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);

  const randomDescription =
    randomReminderDescriptions.find((description) => description.value === randomness)?.text ??
    randomReminderDescriptions[2].text;

  async function performCreate(payload: Omit<CreateReminderInput, "tossUserKey">) {
    setSubmitting(true);
    try {
      await onCreate(payload);
      onCreated();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "리마인더를 만들지 못했어요.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReminder() {
    setFormError(null);
    setTitleError(false);

    if (title.trim().length === 0) {
      setTitleError(true);
      return;
    }

    const payload: Omit<CreateReminderInput, "tossUserKey"> = {
      title: title.trim(),
      allowedStartHour: 9,
      allowedEndHour: 22,
      intensity: priorityToIntensity[priority],
      randomness,
    };

    if (!hasConsented) {
      pendingPayloadRef.current = payload;
      setConsentDialogOpen(true);
      return;
    }

    await performCreate(payload);
  }

  async function handleConsentConfirm() {
    if (consentSubmitting) return;
    setConsentSubmitting(true);
    try {
      await onRequestConsent();
      setConsentDialogOpen(false);
      const payload = pendingPayloadRef.current;
      pendingPayloadRef.current = null;
      if (payload) {
        await performCreate(payload);
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "동의 저장에 실패했어요. 다시 시도해 주세요.";
      setConsentDialogOpen(false);
      pendingPayloadRef.current = null;
      onConsentError(message);
    } finally {
      setConsentSubmitting(false);
    }
  }

  function handleConsentCancel() {
    pendingPayloadRef.current = null;
    setConsentDialogOpen(false);
  }

  return (
    <main className="app-page create-task-page">
      <section className="create-task-title-section">
        <Text display="block" color={adaptive.grey900} typography="t3" fontWeight="bold">
          할 일 추가
        </Text>
      </section>

      <div className="create-task-form">
        <section className="create-task-textarea-section">
          <TextArea
            ref={textAreaRef}
            className="create-task-textarea"
            variant="box"
            hasError={titleError}
            help={titleError ? "할 일을 작성해주세요" : undefined}
            label=""
            labelOption="sustain"
            placeholder="여기에 할 일을 작성해주세요"
            value={title}
            onChange={(event) => {
              setTitle(event.currentTarget.value);
              if (titleError) setTitleError(false);
            }}
            minHeight={78}
          />
        </section>

        <div className="create-task-border" />

        <section className="create-task-section">
          <Spacing size={20} />
          <Text display="block" color={adaptive.grey700} typography="t7" fontWeight="medium">
            우선 순위
          </Text>
          <Spacing size={13} />
          <SegmentedControl
            alignment="fixed"
            value={priority}
            disabled={false}
            size="small"
            name="priority"
            onChange={(value) => {
              const p = value as Priority;
              setPriority(p);
              if (!randomnessTouched) {
                setRandomness(priorityDefaultRandomness[p]);
              }
            }}
          >
            <SegmentedControl.Item value="simple">간단</SegmentedControl.Item>
            <SegmentedControl.Item value="normal">보통</SegmentedControl.Item>
            <SegmentedControl.Item value="important">긴급</SegmentedControl.Item>
          </SegmentedControl>
          <Spacing size={12} />
          <div className="create-task-message-box">
            <Text display="block" color={adaptive.blue600} typography="t6" fontWeight="semibold" textAlign="center">
              {priorityDescriptions[priority]}
            </Text>
          </div>
        </section>

        <section className="create-task-section create-task-random-section">
          <Text display="block" color={adaptive.grey700} typography="t7" fontWeight="medium">
            랜덤 알림
          </Text>
          <Spacing size={26} />
          <Slider
            value={randomness}
            minValue={0}
            maxValue={100}
            step={25}
            color="#3182f6"
            label={{ max: "불규칙적", min: "규칙적" }}
            onValueChange={(v) => {
              setRandomness(v);
              setRandomnessTouched(true);
            }}
          />
          <Spacing size={18} />
          <div className="create-task-message-box">
            <Text display="block" color={adaptive.blue600} typography="t6" fontWeight="semibold" textAlign="center">
              {randomDescription}
            </Text>
          </div>
        </section>

        {(formError ?? error) && (
          <section className="create-task-error-section">
            <Text typography="t6" color={adaptive.red600}>
              {formError ?? error}
            </Text>
          </section>
        )}
      </div>

      {!keyboardOpen && (
        <FixedBottomCTA
          size="large"
          loading={submitting || consentSubmitting}
          disabled={submitting || consentSubmitting || consentLoading}
          onClick={submitReminder}
        >
          추가하기
        </FixedBottomCTA>
      )}
      <NotificationConsentDialog
        open={consentDialogOpen}
        loading={consentSubmitting}
        onConfirm={handleConsentConfirm}
        onCancel={handleConsentCancel}
      />
    </main>
  );
}
