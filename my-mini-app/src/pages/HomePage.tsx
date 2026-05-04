import { adaptive } from "@toss/tds-colors";
import {
  Asset,
  Badge,
  BottomSheet,
  Button,
  Checkbox,
  FixedBottomCTA,
  List,
  ListRow,
  Result,
  Spacing,
  Switch,
  Tab,
  Top,
  useToast,
} from "@toss/tds-mobile";
import { useMemo, useState } from "react";

import { getAdPosition, useBannerAd, useBannerAttach } from "../hooks/useBannerAd";
import type { Reminder, ReminderIntensity } from "../types/reminder";

const BANNER_AD_GROUP_ID = "ait.v2.live.56b4f77a5c824494";

function InlineBannerAd({ adGroupId, initialized }: { adGroupId: string; initialized: boolean }) {
  const ref = useBannerAttach(adGroupId, initialized);
  return (
    <li className="home-banner-ad-item" style={{ listStyle: "none", padding: 0 }}>
      <div ref={ref} style={{ width: "100%", height: 96, borderRadius: 8, overflow: "hidden" }} />
    </li>
  );
}

interface HomePageProps {
  reminders: Reminder[];
  userKey: string | null;
  onCreate: () => void;
  onOpenDetail: (id: string) => void;
  onComplete: (id: string) => Promise<void>;
  onSnooze: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

type HomeTab = "active" | "completed";

const intensityDescriptions: Record<ReminderIntensity, string> = {
  gentle: "가끔 떠올려도 되는 일",
  normal: "급하지는 않지만 잊으면 안 되는 일",
  strong: "잊으면 곤란한 중요한 일",
};

function randomnessToScheduleText(randomness: number): string {
  if (randomness <= 0) return "오늘 안에 알림 예정";
  if (randomness <= 25) return "내일 안에 알림 예정";
  if (randomness <= 50) return "3일 안에 알림 예정";
  if (randomness <= 75) return "4일 안에 알림 예정";
  return "5일 안에 알림 예정";
}

function formatCompletedDate(iso: string | null): string {
  if (!iso) return "완료";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "완료";
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 완료`;
}

function randomnessToBottomText(randomness: number): string {
  if (randomness <= 0) return "오늘 안에 랜덤 알림";
  if (randomness <= 25) return "내일 안에 랜덤 알림";
  if (randomness <= 50) return "3일 안에 랜덤 알림";
  if (randomness <= 75) return "4일 안에 랜덤 알림";
  return "5일 안에 랜덤 알림";
}

const intensityLabel: Record<ReminderIntensity, string> = {
  gentle: "간단",
  normal: "보통",
  strong: "긴급",
};

const intensityBadgeColor: Record<ReminderIntensity, "green" | "blue" | "yellow"> = {
  gentle: "green",
  normal: "blue",
  strong: "yellow",
};

export function HomePage({
  reminders,
  userKey,
  onCreate,
  onOpenDetail,
  onComplete,
  onSnooze,
  onDelete,
}: HomePageProps) {
  const [tab, setTab] = useState<HomeTab>("active");
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const bannerInitialized = useBannerAd();
  const { openToast } = useToast();

  function showSuccessToast(text: string, options?: { higherThanCTA?: boolean }) {
    void openToast(text, {
      type: "bottom",
      lottie: "https://static.toss.im/lotties-common/check-green-spot.json",
      higherThanCTA: options?.higherThanCTA ?? true,
    });
  }

  const activeReminders = useMemo(
    () => reminders
      .filter((r) => r.status === "active")
      .sort((a, b) => {
        const aSnoozed = a.snoozedUntil != null && new Date(a.snoozedUntil) > new Date() ? 1 : 0;
        const bSnoozed = b.snoozedUntil != null && new Date(b.snoozedUntil) > new Date() ? 1 : 0;
        if (aSnoozed !== bSnoozed) return bSnoozed - aSnoozed;
        const rank: Record<string, number> = { strong: 0, normal: 1, gentle: 2 };
        return (rank[a.intensity] ?? 1) - (rank[b.intensity] ?? 1);
      }),
    [reminders],
  );

  const completedReminders = useMemo(
    () => reminders
      .filter((r) => r.status === "completed")
      .sort((a, b) => {
        const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return bTime - aTime;
      }),
    [reminders],
  );

  const displayedReminders = tab === "active" ? activeReminders : completedReminders;

  const today = new Date();
  const dateString = `${String(today.getFullYear()).slice(2)}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  function handleItemClick(reminder: Reminder) {
    setSelectedReminder(reminder);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setSelectedReminder(null);
  }

  async function handleComplete() {
    if (!selectedReminder) return;
    await onComplete(selectedReminder.id);
    closeSheet();
    showSuccessToast("할 일을 끝냈어요.");
  }

  async function handleSnooze() {
    if (!selectedReminder) return;
    await onSnooze(selectedReminder.id);
    closeSheet();
  }

  async function handleDelete() {
    if (!selectedReminder) return;
    await onDelete(selectedReminder.id);
    closeSheet();
    showSuccessToast("끝낸 일을 지웠어요.", { higherThanCTA: false });
  }

  function handleEdit() {
    if (!selectedReminder) return;
    const id = selectedReminder.id;
    closeSheet();
    onOpenDetail(id);
  }

  const isSnoozed = selectedReminder?.snoozedUntil != null
    && new Date(selectedReminder.snoozedUntil) > new Date();

  const isEmpty = displayedReminders.length === 0;

  return (
    <main className="app-page home-page">
      <Spacing size={12} />
      <Top
        title={
          <Top.TitleParagraph size={22} color={adaptive.grey900}>
            {isEmpty && tab === "active" ? "일정 없음" : `총 ${activeReminders.length}개의 할 일이 있어요`}
          </Top.TitleParagraph>
        }
        subtitleTop={
          <Top.SubtitleParagraph>{dateString}</Top.SubtitleParagraph>
        }
      />
      <Tab
        fluid={false}
        size="large"
        style={{ backgroundColor: adaptive.background }}
      >
        <Tab.Item
          key="active"
          selected={tab === "active"}
          backgroundColor={adaptive.background}
          onClick={() => setTab("active")}
        >
          {`할일 (${activeReminders.length})`}
        </Tab.Item>
        <Tab.Item
          key="completed"
          selected={tab === "completed"}
          backgroundColor={adaptive.background}
          onClick={() => setTab("completed")}
        >
          {`완료 (${completedReminders.length})`}
        </Tab.Item>
      </Tab>

      {isEmpty ? (
        <Result
          title="아직 일정이 없어요"
          description={`아래 버튼을 눌러 해야할 일을 추가해보세요.\n랜덤으로 알려드릴게요.`}
          figure={
            <Asset.Lottie
              frameShape={Asset.frameShape.CleanW60}
              src="https://static.toss.im/lotties-common/empty-spot.json"
              aria-hidden={true}
            />
          }
        />
      ) : (
        <List>
          {(() => {
            const adPos = tab === "active" && userKey
              ? getAdPosition(userKey, displayedReminders.length)
              : null;
            const items: React.ReactNode[] = [];

            displayedReminders.forEach((reminder, index) => {
              if (adPos !== null && index === adPos) {
                items.push(
                  <InlineBannerAd
                    key="banner-ad"
                    adGroupId={BANNER_AD_GROUP_ID}
                    initialized={bannerInitialized}
                  />,
                );
              }

              const reminderSnoozed = reminder.snoozedUntil != null
                  && new Date(reminder.snoozedUntil) > new Date();
              const isCompleted = reminder.status === "completed";

              items.push(
                <ListRow
                  key={reminder.id}
                  leftAlignment="center"
                  left={
                    reminderSnoozed && !isCompleted ? (
                      <Asset.Icon
                        frameShape={Asset.frameShape.CleanW30}
                        backgroundColor="transparent"
                        name="icon-pause-circle-mono"
                        color={adaptive.grey400}
                        aria-hidden={true}
                        ratio="1/1"
                      />
                    ) : (
                      <Checkbox.Circle size={30} checked={isCompleted} readOnly />
                    )
                  }
                  contents={
                    <ListRow.Texts
                      type="2RowTypeA"
                      top={<span className="home-list-text-truncate" style={{ fontWeight: 700, color: adaptive.grey700 }}>{reminder.title}</span>}
                      topProps={{}}
                      bottom={
                        isCompleted
                          ? formatCompletedDate(reminder.completedAt)
                          : reminderSnoozed
                            ? "알림 일시 정지"
                            : randomnessToBottomText(reminder.randomness)
                      }
                      bottomProps={{ color: adaptive.grey500, typography: "t7" }}
                    />
                  }
                  right={
                    reminderSnoozed && !isCompleted ? (
                      <Badge size="small" color="elephant" variant="weak">
                        일시 정지
                      </Badge>
                    ) : !isCompleted ? (
                      <Badge size="small" color={intensityBadgeColor[reminder.intensity]} variant="weak">
                        {intensityLabel[reminder.intensity]}
                      </Badge>
                    ) : undefined
                  }
                  horizontalPadding="small"
                  onClick={() => handleItemClick(reminder)}
                />,
              );
            });

            // 리스트 끝에 광고가 위치해야 하는 경우
            if (adPos !== null && adPos >= displayedReminders.length) {
              items.push(
                <InlineBannerAd
                  key="banner-ad"
                  adGroupId={BANNER_AD_GROUP_ID}
                  initialized={bannerInitialized}
                />,
              );
            }

            return items;
          })()}
        </List>
      )}

      {tab === "active" && (
        <FixedBottomCTA size="large" loading={false} onClick={onCreate}>
          추가하기
        </FixedBottomCTA>
      )}

      {selectedReminder && (() => {
        const isSelectedCompleted = selectedReminder.status === "completed";

        return (
          <BottomSheet
            header={
              <BottomSheet.Header>
                {selectedReminder.title}
              </BottomSheet.Header>
            }
            headerDescription={
              <BottomSheet.HeaderDescription>
                {isSelectedCompleted
                  ? "완료된 할 일"
                  : intensityDescriptions[selectedReminder.intensity]}
              </BottomSheet.HeaderDescription>
            }
            open={sheetOpen}
            onClose={closeSheet}
            cta={
              <BottomSheet.DoubleCTA
                hasSafeAreaPadding={false}
                leftButton={
                  isSelectedCompleted ? (
                    <Button size="large" color="dark" variant="weak" onClick={closeSheet}>
                      닫기
                    </Button>
                  ) : (
                    <Button size="large" color="dark" variant="weak" onClick={handleEdit}>
                      수정하기
                    </Button>
                  )
                }
                rightButton={
                  isSelectedCompleted ? (
                    <Button size="large" color="danger" onClick={handleDelete}>삭제하기</Button>
                  ) : (
                    <Button size="large" onClick={handleComplete}>완료했어요</Button>
                  )
                }
              />
            }
          >
            <ListRow
              contents={
                <ListRow.Texts
                  type="1RowTypeB"
                  top="알림 예정"
                  topProps={{ color: isSelectedCompleted ? adaptive.grey400 : adaptive.grey800 }}
                />
              }
              right={
                <ListRow.Texts
                  type="Right1RowTypeA"
                  top={isSelectedCompleted ? "완료됨" : randomnessToScheduleText(selectedReminder.randomness)}
                  topProps={{ color: isSelectedCompleted ? adaptive.grey400 : adaptive.grey700 }}
                />
              }
              verticalPadding="small"
            />
            <ListRow
              role="switch"
              aria-checked={isSnoozed}
              contents={
                <ListRow.Texts
                  type="1RowTypeB"
                  top="오늘 하루 알림 끄기"
                  topProps={{ color: isSelectedCompleted ? adaptive.grey400 : adaptive.grey800 }}
                />
              }
              right={<Switch checked={isSnoozed} disabled={isSelectedCompleted} onChange={handleSnooze} />}
              verticalPadding="small"
            />
          </BottomSheet>
        );
      })()}
    </main>
  );
}
