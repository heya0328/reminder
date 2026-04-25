import { colors } from "@toss/tds-colors";
import {
  Button,
  Checkbox,
  List,
  ListHeader,
  ListRow,
  SegmentedControl,
  Switch,
  Text,
  TextButton,
  TextField,
  Top,
} from "@toss/tds-mobile";
import { FormEvent, useMemo, useState } from "react";

import {
  INTENSITY_DESCRIPTIONS,
  INTENSITY_LABELS,
  INTENSITY_OPTIONS,
  TIME_PRESETS,
} from "../constants/reminderOptions";
import type { CreateReminderInput, ReminderIntensity } from "../types/reminder";

interface CreateReminderPageProps {
  error: string | null;
  onBack: () => void;
  onCreated: () => void;
  onCreate: (input: Omit<CreateReminderInput, "tossUserKey">) => Promise<void>;
}

export function CreateReminderPage({
  error,
  onBack,
  onCreated,
  onCreate,
}: CreateReminderPageProps) {
  const [title, setTitle] = useState("");
  const [timePresetId, setTimePresetId] = useState(TIME_PRESETS[0].id);
  const [intensity, setIntensity] = useState<ReminderIntensity>("normal");
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsConsentChecked, setSmsConsentChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedTimePreset = useMemo(
    () =>
      TIME_PRESETS.find((preset) => preset.id === timePresetId) ??
      TIME_PRESETS[0],
    [timePresetId],
  );

  const canSubmit =
    title.trim().length > 0 &&
    (!smsEnabled || (phoneNumber.trim().length > 0 && smsConsentChecked));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!canSubmit) {
      setFormError("제목과 알림 수단을 확인해 주세요.");
      return;
    }

    setSubmitting(true);

    try {
      await onCreate({
        title: title.trim(),
        allowedStartHour: selectedTimePreset.allowedStartHour,
        allowedEndHour: selectedTimePreset.allowedEndHour,
        intensity,
        smsEnabled,
        phoneNumber: smsEnabled ? phoneNumber.trim() : undefined,
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

  return (
    <main className="app-page">
      <Top
        title={
          <Top.TitleParagraph size={22}>리마인더 만들기</Top.TitleParagraph>
        }
        subtitleBottom={
          <Top.SubtitleParagraph size={17}>
            제목만 적어두면 랜덤한 시점에 다시 알려드려요.
          </Top.SubtitleParagraph>
        }
      />

      <form className="app-form" onSubmit={handleSubmit}>
        <section className="app-section">
          <TextField
            variant="box"
            label="할 일"
            labelOption="sustain"
            placeholder="예: 치과 예약 잡기"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
            help="구체적으로 쓸수록 나중에 바로 행동하기 쉬워요."
          />
        </section>

        <List>
          <ListHeader
            title={
              <ListHeader.TitleParagraph typography="t5" fontWeight="bold">
                받을 시간
              </ListHeader.TitleParagraph>
            }
          />
          <ListRow
            verticalPadding="large"
            contents={
              <SegmentedControl
                size="large"
                value={timePresetId}
                onChange={setTimePresetId}
              >
                {TIME_PRESETS.map((preset) => (
                  <SegmentedControl.Item key={preset.id} value={preset.id}>
                    {preset.label}
                  </SegmentedControl.Item>
                ))}
              </SegmentedControl>
            }
          />
          <ListRow
            verticalPadding="medium"
            contents={
              <ListRow.Texts
                type="1RowTypeA"
                top={selectedTimePreset.description}
                topProps={{ color: colors.grey600 }}
              />
            }
          />
        </List>

        <List>
          <ListHeader
            title={
              <ListHeader.TitleParagraph typography="t5" fontWeight="bold">
                강도
              </ListHeader.TitleParagraph>
            }
          />
          <ListRow
            verticalPadding="large"
            contents={
              <SegmentedControl
                size="large"
                value={intensity}
                onChange={(value) => setIntensity(value as ReminderIntensity)}
              >
                {INTENSITY_OPTIONS.map((option) => (
                  <SegmentedControl.Item key={option} value={option}>
                    {INTENSITY_LABELS[option]}
                  </SegmentedControl.Item>
                ))}
              </SegmentedControl>
            }
          />
          <ListRow
            verticalPadding="medium"
            contents={
              <ListRow.Texts
                type="1RowTypeA"
                top={INTENSITY_DESCRIPTIONS[intensity]}
                topProps={{ color: colors.grey600 }}
              />
            }
          />
        </List>

        <List>
          <ListHeader
            title={
              <ListHeader.TitleParagraph typography="t5" fontWeight="bold">
                알림 수단
              </ListHeader.TitleParagraph>
            }
          />
          <ListRow
            verticalPadding="large"
            contents={
              <ListRow.Texts
                type="2RowTypeA"
                top="토스 앱 푸시"
                topProps={{ color: colors.grey800, fontWeight: "bold" }}
                bottom="기본으로 먼저 보내요"
                bottomProps={{ color: colors.grey600 }}
              />
            }
            right={<Switch checked={true} disabled={true} />}
          />
          <ListRow
            verticalPadding="large"
            contents={
              <ListRow.Texts
                type="2RowTypeA"
                top="SMS 대체 발송"
                topProps={{ color: colors.grey800, fontWeight: "bold" }}
                bottom="푸시를 보낼 수 없을 때만 사용해요"
                bottomProps={{ color: colors.grey600 }}
              />
            }
            right={
              <Switch
                checked={smsEnabled}
                onChange={(_, checked) => {
                  setSmsEnabled(checked);
                  if (!checked) {
                    setSmsConsentChecked(false);
                    setPhoneNumber("");
                  }
                }}
              />
            }
          />
        </List>

        {smsEnabled && (
          <section className="app-section app-section--stack">
            <TextField
              variant="box"
              label="휴대폰 번호"
              labelOption="sustain"
              placeholder="01012345678"
              value={phoneNumber}
              inputMode="tel"
              onChange={(event) => setPhoneNumber(event.currentTarget.value)}
              help="SMS 발송과 수신 거부 처리에만 사용해요."
            />

            <div className="consent-row">
              <Checkbox.Line
                checked={smsConsentChecked}
                onCheckedChange={setSmsConsentChecked}
                aria-label="SMS 수신 동의"
              />
              <Text typography="t6" color={colors.grey700}>
                푸시 발송이 어려운 경우 SMS로 리마인더를 받을 수 있고, 문자 안의 안내로
                언제든 수신을 거부할 수 있어요.
              </Text>
            </div>
          </section>
        )}

        {(formError ?? error) && (
          <section className="app-section">
            <Text typography="t6" color={colors.red500}>
              {formError ?? error}
            </Text>
          </section>
        )}

        <section className="app-section app-actions">
          <Button
            type="submit"
            size="large"
            color="primary"
            loading={submitting}
            disabled={!canSubmit || submitting}
          >
            만들기
          </Button>
          <TextButton size="medium" color={colors.grey600} onClick={onBack}>
            취소
          </TextButton>
        </section>
      </form>
    </main>
  );
}
