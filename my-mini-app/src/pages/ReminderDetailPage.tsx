import { adaptive } from "@toss/tds-colors";
import {
  FixedBottomCTA,
  Result,
  SegmentedControl,
  Slider,
  Spacing,
  Text,
  TextArea,
} from "@toss/tds-mobile";
import { useState } from "react";

import type { Reminder, ReminderIntensity } from "../types/reminder";

interface ReminderDetailPageProps {
  reminder: Reminder | undefined;
  onBack: () => void;
  onSaved: () => void;
  onUpdate: (id: string, input: { title?: string; intensity?: string; randomness?: number }) => Promise<void>;
}

type Priority = "simple" | "normal" | "important";

const intensityToPriority: Record<ReminderIntensity, Priority> = {
  gentle: "simple",
  normal: "normal",
  strong: "important",
};

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
  { value: 0, text: "오늘 안에 한 번 확실히 알려드릴게요" },
  { value: 25, text: "내일 안에 한 번 다시 떠올려드릴게요" },
  { value: 50, text: "3일 안에 예측하기 어렵게 알려드릴게요" },
  { value: 75, text: "4일 안에 더 불규칙하게 떠올려드릴게요" },
  { value: 100, text: "5일 안에 가장 예상 못 한 순간 알려드릴게요" },
];

export function ReminderDetailPage({
  reminder,
  onBack,
  onSaved,
  onUpdate,
}: ReminderDetailPageProps) {
  const [title, setTitle] = useState(reminder?.title ?? "");
  const [priority, setPriority] = useState<Priority>(
    reminder ? intensityToPriority[reminder.intensity] : "normal",
  );
  const [randomness, setRandomness] = useState(reminder?.randomness ?? 50);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState(false);

  if (reminder == null) {
    return (
      <main className="app-page">
        <Result
          title="리마인더를 찾지 못했어요"
          description="목록에서 다시 선택해 주세요."
          button={<Result.Button onClick={onBack}>돌아가기</Result.Button>}
        />
      </main>
    );
  }

  const randomDescription =
    randomReminderDescriptions.find((d) => d.value === randomness)?.text ??
    randomReminderDescriptions[2].text;

  async function submitUpdate() {
    if (!reminder) return;
    setFormError(null);
    setTitleError(false);

    if (title.trim().length === 0) {
      setTitleError(true);
      return;
    }

    setSubmitting(true);

    try {
      await onUpdate(reminder.id, {
        title: title.trim(),
        intensity: priorityToIntensity[priority],
        randomness,
      });
      onSaved();
    } catch (caughtError) {
      setFormError(
        caughtError instanceof Error
          ? caughtError.message
          : "수정에 실패했어요.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-page create-task-page">
      <section className="create-task-title-section">
        <Text display="block" color={adaptive.grey900} typography="t3" fontWeight="bold">
          할 일 수정
        </Text>
      </section>

      <div className="create-task-form">
        <section className="create-task-textarea-section">
          <TextArea
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
            onChange={(value) => setPriority(value as Priority)}
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
            onValueChange={setRandomness}
          />
          <Spacing size={18} />
          <div className="create-task-message-box">
            <Text display="block" color={adaptive.blue600} typography="t6" fontWeight="semibold" textAlign="center">
              {randomDescription}
            </Text>
          </div>
        </section>

        {formError && (
          <section className="create-task-error-section">
            <Text typography="t6" color={adaptive.red600}>
              {formError}
            </Text>
          </section>
        )}
      </div>

      <FixedBottomCTA size="large" loading={submitting} disabled={submitting} onClick={submitUpdate}>
        수정하기
      </FixedBottomCTA>
    </main>
  );
}
