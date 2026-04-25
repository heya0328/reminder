import { colors } from "@toss/tds-colors";
import {
  Badge,
  Button,
  List,
  ListHeader,
  ListRow,
  Result,
  Text,
  TextButton,
  Top,
} from "@toss/tds-mobile";
import { useState } from "react";

import {
  INTENSITY_DESCRIPTIONS,
  INTENSITY_LABELS,
} from "../constants/reminderOptions";
import type { Reminder } from "../types/reminder";

interface ReminderDetailPageProps {
  reminder: Reminder | undefined;
  onBack: () => void;
  onComplete: (id: string) => Promise<void>;
  onSnooze: (id: string) => Promise<void>;
}

export function ReminderDetailPage({
  reminder,
  onBack,
  onComplete,
  onSnooze,
}: ReminderDetailPageProps) {
  const [submittingAction, setSubmittingAction] = useState<
    "complete" | "snooze" | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (reminder == null) {
    return (
      <main className="app-page">
        <Top
          title={
            <Top.TitleParagraph size={22}>리마인더 상세</Top.TitleParagraph>
          }
        />
        <Result
          style={{ minHeight: 300 }}
          title="리마인더를 찾지 못했어요"
          description="목록에서 다시 선택해 주세요."
          button={<Result.Button onClick={onBack}>목록으로</Result.Button>}
        />
      </main>
    );
  }

  async function runAction(action: "complete" | "snooze") {
    if (reminder == null) {
      return;
    }

    setSubmittingAction(action);
    setActionError(null);

    try {
      if (action === "complete") {
        await onComplete(reminder.id);
      } else {
        await onSnooze(reminder.id);
      }
      onBack();
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "요청을 처리하지 못했어요.",
      );
    } finally {
      setSubmittingAction(null);
    }
  }

  return (
    <main className="app-page">
      <Top
        title={<Top.TitleParagraph size={22}>{reminder.title}</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={17}>
            랜덤 발송 조건과 상태를 확인해요.
          </Top.SubtitleParagraph>
        }
      />

      <List>
        <ListHeader
          title={
            <ListHeader.TitleParagraph typography="t5" fontWeight="bold">
              설정
            </ListHeader.TitleParagraph>
          }
        />
        <ListRow
          verticalPadding="large"
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="받을 수 있는 시간"
              topProps={{ color: colors.grey800, fontWeight: "bold" }}
              bottom={`${reminder.allowedStartHour}시부터 ${reminder.allowedEndHour}시 사이`}
              bottomProps={{ color: colors.grey600 }}
            />
          }
        />
        <ListRow
          verticalPadding="large"
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="강도"
              topProps={{ color: colors.grey800, fontWeight: "bold" }}
              bottom={INTENSITY_DESCRIPTIONS[reminder.intensity]}
              bottomProps={{ color: colors.grey600 }}
            />
          }
          right={
            <Badge size="small" color="blue" variant="weak">
              {INTENSITY_LABELS[reminder.intensity]}
            </Badge>
          }
        />
        <ListRow
          verticalPadding="large"
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="상태"
              topProps={{ color: colors.grey800, fontWeight: "bold" }}
              bottom={formatStatus(reminder)}
              bottomProps={{ color: colors.grey600 }}
            />
          }
        />
      </List>

      {actionError && (
        <section className="app-section">
          <Text typography="t6" color={colors.red500}>
            {actionError}
          </Text>
        </section>
      )}

      <section className="app-section app-actions">
        <Button
          size="large"
          color="primary"
          loading={submittingAction === "complete"}
          disabled={submittingAction !== null || reminder.status !== "active"}
          onClick={() => void runAction("complete")}
        >
          완료했어요
        </Button>
        <Button
          size="large"
          variant="weak"
          loading={submittingAction === "snooze"}
          disabled={submittingAction !== null || reminder.status !== "active"}
          onClick={() => void runAction("snooze")}
        >
          나중에 다시 알림
        </Button>
        <TextButton size="medium" color={colors.grey600} onClick={onBack}>
          뒤로
        </TextButton>
      </section>
    </main>
  );
}

function formatStatus(reminder: Reminder) {
  if (reminder.status === "completed") {
    return "완료됨";
  }

  if (reminder.status === "disabled") {
    return "비활성화됨";
  }

  if (reminder.snoozedUntil != null) {
    return `${new Date(reminder.snoozedUntil).toLocaleString("ko-KR")}까지 쉬는 중`;
  }

  return "발송 대기 중";
}
