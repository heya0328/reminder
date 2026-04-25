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

import {
  INTENSITY_LABELS,
  TIME_PRESETS,
} from "../constants/reminderOptions";
import type { Reminder } from "../types/reminder";

interface ReminderListPageProps {
  reminders: Reminder[];
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onCreate: () => void;
  onRefresh: () => void;
  onOpenDetail: (id: string) => void;
}

export function ReminderListPage({
  reminders,
  loading,
  error,
  onBack,
  onCreate,
  onRefresh,
  onOpenDetail,
}: ReminderListPageProps) {
  const activeReminders = reminders.filter(
    (reminder) => reminder.status === "active",
  );

  return (
    <main className="app-page">
      <Top
        title={<Top.TitleParagraph size={22}>내 리마인더</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={17}>
            아직 완료하지 않은 일만 모아봤어요.
          </Top.SubtitleParagraph>
        }
      />

      <section className="app-section app-actions">
        <Button size="large" color="primary" onClick={onCreate}>
          새로 만들기
        </Button>
      </section>

      {loading && (
        <section className="app-section">
          <Text typography="t5" color={colors.grey600}>
            리마인더를 불러오는 중이에요.
          </Text>
        </section>
      )}

      {error && (
        <section className="app-section app-actions">
          <Text typography="t6" color={colors.red500}>
            {error}
          </Text>
          <Button size="medium" variant="weak" onClick={onRefresh}>
            다시 불러오기
          </Button>
        </section>
      )}

      {!loading && activeReminders.length === 0 && (
        <Result
          style={{ minHeight: 300 }}
          title="기다리는 리마인더가 없어요"
          description="언젠가 해야 할 일을 하나만 적어보세요."
          button={<Result.Button onClick={onCreate}>리마인더 만들기</Result.Button>}
        />
      )}

      {activeReminders.length > 0 && (
        <List>
          <ListHeader
            title={
              <ListHeader.TitleParagraph typography="t5" fontWeight="bold">
                활성 리마인더
              </ListHeader.TitleParagraph>
            }
          />
          {activeReminders.map((reminder) => (
            <ListRow
              key={reminder.id}
              verticalPadding="large"
              contents={
                <ListRow.Texts
                  type="3RowTypeA"
                  top={reminder.title}
                  topProps={{ color: colors.grey800, fontWeight: "bold" }}
                  middle={formatWindow(reminder)}
                  middleProps={{ color: colors.grey600 }}
                  bottom={formatSnooze(reminder)}
                  bottomProps={{ color: colors.grey500 }}
                />
              }
              right={
                <Badge color="blue" variant="weak">
                  {INTENSITY_LABELS[reminder.intensity]}
                </Badge>
              }
              arrowType="right"
              onClick={() => onOpenDetail(reminder.id)}
            />
          ))}
        </List>
      )}

      <section className="app-section">
        <TextButton size="medium" color={colors.grey600} onClick={onBack}>
          홈으로
        </TextButton>
      </section>
    </main>
  );
}

function formatWindow(reminder: Reminder) {
  const preset = TIME_PRESETS.find(
    (option) =>
      option.allowedStartHour === reminder.allowedStartHour &&
      option.allowedEndHour === reminder.allowedEndHour,
  );

  return preset?.description ?? `${reminder.allowedStartHour}시부터 ${reminder.allowedEndHour}시 사이`;
}

function formatSnooze(reminder: Reminder) {
  if (reminder.snoozedUntil == null) {
    return "스누즈 없음";
  }

  return `${new Date(reminder.snoozedUntil).toLocaleString("ko-KR")}까지 쉬어요`;
}
