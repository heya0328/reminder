import { colors } from "@toss/tds-colors";
import { List, ListHeader, ListRow, Result, TextButton, Top } from "@toss/tds-mobile";

import type { Reminder } from "../types/reminder";

interface InboxPageProps {
  reminders: Reminder[];
  onBack: () => void;
  onOpenDetail: (id: string) => void;
}

export function InboxPage({ reminders, onBack, onOpenDetail }: InboxPageProps) {
  const completedReminders = reminders.filter(
    (reminder) => reminder.status === "completed",
  );

  return (
    <main className="app-page">
      <Top
        title={<Top.TitleParagraph size={22}>받은 알림함</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={17}>
            발송 이력 API가 연결되면 실제 받은 알림이 여기에 쌓여요.
          </Top.SubtitleParagraph>
        }
      />

      {completedReminders.length === 0 ? (
        <Result
          style={{ minHeight: 300 }}
          title="아직 받은 리마인더가 없어요"
          description="첫 랜덤 알림이 발송된 뒤 이 화면에서 기록을 볼 수 있어요."
        />
      ) : (
        <List>
          <ListHeader
            title={
              <ListHeader.TitleParagraph typography="t5" fontWeight="bold">
                완료한 리마인더
              </ListHeader.TitleParagraph>
            }
          />
          {completedReminders.map((reminder) => (
            <ListRow
              key={reminder.id}
              verticalPadding="large"
              contents={
                <ListRow.Texts
                  type="2RowTypeA"
                  top={reminder.title}
                  topProps={{ color: colors.grey800, fontWeight: "bold" }}
                  bottom={`만든 날 ${new Date(reminder.createdAt).toLocaleDateString("ko-KR")}`}
                  bottomProps={{ color: colors.grey600 }}
                />
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
