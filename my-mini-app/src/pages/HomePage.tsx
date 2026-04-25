import { colors } from "@toss/tds-colors";
import { Button, List, ListHeader, ListRow, Text, Top } from "@toss/tds-mobile";

interface HomePageProps {
  activeCount: number;
  onCreate: () => void;
  onOpenList: () => void;
  onOpenInbox: () => void;
}

export function HomePage({
  activeCount,
  onCreate,
  onOpenList,
  onOpenInbox,
}: HomePageProps) {
  return (
    <main className="app-page">
      <Top
        title={
          <Top.TitleParagraph size={22}>랜덤 리마인더</Top.TitleParagraph>
        }
        subtitleBottom={
          <Top.SubtitleParagraph size={17}>
            언젠가 해야 하는 일을 예측 못 할 순간에 다시 알려드려요.
          </Top.SubtitleParagraph>
        }
      />

      <section className="app-section">
        <Button size="large" color="primary" onClick={onCreate}>
          리마인더 만들기
        </Button>
      </section>

      <List>
        <ListHeader
          title={
            <ListHeader.TitleParagraph typography="t5" fontWeight="bold">
              바로가기
            </ListHeader.TitleParagraph>
          }
        />
        <ListRow
          verticalPadding="large"
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="내 리마인더"
              topProps={{ color: colors.grey800, fontWeight: "bold" }}
              bottom={`${activeCount}개가 기다리고 있어요`}
              bottomProps={{ color: colors.grey600 }}
            />
          }
          withArrow={true}
          onClick={onOpenList}
        />
        <ListRow
          verticalPadding="large"
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="받은 알림함"
              topProps={{ color: colors.grey800, fontWeight: "bold" }}
              bottom="발송된 리마인더 기록을 확인해요"
              bottomProps={{ color: colors.grey600 }}
            />
          }
          withArrow={true}
          onClick={onOpenInbox}
        />
      </List>

      <section className="app-section">
        <Text typography="t5" fontWeight="bold" color={colors.grey800}>
          이런 일에 좋아요
        </Text>
      </section>
      <List>
        {["치과 예약 잡기", "자동이체 확인하기", "부모님께 안부 전화하기"].map(
          (example) => (
            <ListRow
              key={example}
              verticalPadding="medium"
              contents={
                <ListRow.Texts
                  type="1RowTypeA"
                  top={example}
                  topProps={{ color: colors.grey700 }}
                />
              }
            />
          ),
        )}
      </List>
    </main>
  );
}
