import { adaptive } from "@toss/tds-colors";
import {
  Asset,
  Border,
  FixedBottomCTA,
  SegmentedControl,
  Slider,
  Spacing,
  Text,
  TextArea,
} from "@toss/tds-mobile";
import { FormEvent, useState } from "react";

import type { CreateReminderInput, ReminderIntensity } from "../types/reminder";

interface CreateReminderPageProps {
  error: string | null;
  onBack: () => void;
  onCreated: () => void;
  onCreate: (input: Omit<CreateReminderInput, "tossUserKey">) => Promise<void>;
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

const randomReminderDescriptions = [
  { max: 33, text: "3일 안에 차분하게 알려드릴게요" },
  { max: 66, text: "1~3일 안에 시간은 랜덤으로 알려드릴게요" },
  { max: 100, text: "하루 안에 조금 더 불규칙하게 알려드릴게요" },
];

export function CreateReminderPage({
  error,
  onBack,
  onCreated,
  onCreate,
}: CreateReminderPageProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [randomness, setRandomness] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const randomDescription =
    randomReminderDescriptions.find((description) => randomness <= description.max)?.text ??
    randomReminderDescriptions[1].text;

  async function submitReminder() {
    setFormError(null);

    if (title.trim().length === 0) {
      setFormError("할 일을 작성해주세요.");
      return;
    }

    setSubmitting(true);

    try {
      await onCreate({
        title: title.trim(),
        allowedStartHour: 9,
        allowedEndHour: 22,
        intensity: priorityToIntensity[priority],
        smsEnabled: false,
      });
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitReminder();
  }

  return (
    <main className="app-page create-task-page">
      <div className="create-task-appbar" aria-label="앱 상단 메뉴">
        <button className="create-task-icon-button" type="button" onClick={onBack} aria-label="뒤로가기">
          <Asset.Icon
            frameShape={Asset.frameShape.CleanW24}
            name="icon-arrow-back-ios-mono"
            color="#191F28ff"
            aria-hidden={true}
          />
        </button>
        <div className="create-task-brand">
          <Asset.Image
            frameShape={Asset.frameShape.CleanW16}
            src="https://static.toss.im/appsintoss/30619/a5a2f92e-5163-458e-a027-5cafedb34a8f.png"
            aria-hidden={true}
          />
          <Text color="#191F28ff" typography="t6" fontWeight="semibold">
            랜덤노트
          </Text>
        </div>
        <div className="create-task-window-actions" aria-hidden={true}>
          <Asset.Icon
            frameShape={Asset.frameShape.CleanW20}
            name="icon-dots-mono"
            color="rgba(0, 19, 43, 0.58)"
            aria-hidden={true}
          />
          <span className="create-task-window-divider" />
          <Asset.Icon
            frameShape={Asset.frameShape.CleanW20}
            name="icon-x-mono"
            color="rgba(0, 19, 43, 0.58)"
            aria-hidden={true}
          />
        </div>
      </div>

      <section className="create-task-title-section">
        <Text display="block" color={adaptive.grey900} typography="t3" fontWeight="bold">
          할 일 추가
        </Text>
      </section>

      <form className="create-task-form" onSubmit={handleSubmit}>
        <section className="create-task-textarea-section">
          <TextArea
            className="create-task-textarea"
            variant="box"
            hasError={false}
            label=""
            labelOption="sustain"
            placeholder="여기에 할 일을 작성해주세요"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
            minHeight={78}
          />
        </section>

        <Border variant="height16" />

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
            onChange={(value) => setPriority(value as Priority)}
          >
            <SegmentedControl.Item value="simple">간단</SegmentedControl.Item>
            <SegmentedControl.Item value="normal">중간</SegmentedControl.Item>
            <SegmentedControl.Item value="important">중요</SegmentedControl.Item>
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
            color="#3182f6"
            label={{ max: "불규칙적", min: "규칙적" }}
            onValueChange={setRandomness}
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

        <FixedBottomCTA type="button" loading={submitting} disabled={submitting} onClick={submitReminder}>
          추가하기
        </FixedBottomCTA>
      </form>
    </main>
  );
}
