# Random Reminder Design

## Summary

Random Reminder is an Apps in Toss mini-app for people who keep delaying small but important life-admin tasks. The first version focuses on tasks like booking a clinic visit, submitting a document, canceling a subscription, returning a package, or calling customer support.

The product is not a general calendar. It is a controlled random re-exposure system. A user registers a task, chooses an allowed time window, chooses a random intensity, and consents to reminder channels. The server later chooses unpredictable reminder moments inside the user's safe boundaries. Toss push is preferred when useful, and SMS is used as a fallback or coverage channel because Apps in Toss push availability is constrained by platform policy and delivery windows.

## Office-Hours Decisions

- Target user: people postponing personal life-admin tasks.
- First task category: annoying but concrete life-admin work.
- Registration density: task title, allowed time window, random intensity.
- MVP channels: Toss push plus SMS.
- Channel strategy: Toss push first, SMS fallback.
- Server scope: minimum real sending server with reminders, consent, batch scheduling, channel choice, send logs, and unsubscribe support.

## Product Promise

"Register the thing you keep putting off. We will bring it back at a moment you did not predict, but only inside the time and channel boundaries you approved."

The product should feel slightly surprising, never reckless. Randomness is used for timing and channel choice only. Message content stays fixed and template-based.

## MVP Scope

### In Scope

- Create a reminder.
- Choose an allowed time window.
- Choose random intensity.
- Provide SMS consent and phone number when SMS is enabled.
- Show current reminders.
- Show reminder history/inbox.
- Mark a reminder as completed.
- Snooze a reminder.
- Disable a reminder.
- Unsubscribe SMS.
- Server-side reminder storage.
- Server-side scheduling batch.
- Server-side channel decision.
- Server-side send logs.
- Daily send caps.
- Night-time send restrictions.
- Fixed SMS templates.
- Local-browser fallbacks for Apps in Toss SDK behavior.

### Out of Scope

- Full calendar replacement.
- Complex recurrence rules.
- AI-generated message copy.
- Randomized SMS text.
- Admin console.
- Contact import.
- Calendar import.
- Team/shared reminders.
- Payment.
- Ads.

## User Experience

### First Run

The first screen explains the wedge in one sentence: this app is for the tasks the user keeps avoiding. The user sees examples, not a broad blank canvas:

- "병원 예약하기"
- "구독 해지하기"
- "택배 반품하기"
- "서류 제출하기"

The primary action is creating the first reminder.

### Create Reminder

The create flow has three required inputs:

1. Task title.
2. Allowed time window.
3. Random intensity.

SMS setup appears only when the user enables SMS. It asks for explicit consent and phone number entry. SMS consent must be separate from Toss push and must include unsubscribe guidance.

### Random Intensity

Use three user-facing options:

- Gentle: at most 1 reminder per day.
- Normal: at most 2 reminders per day.
- Strong: at most 3 reminders per day.

The server still enforces global caps, night restrictions, consent, and channel availability. Strong does not mean unlimited.

### Reminder Inbox

The app shows recent reminders sent to the user. Each item includes:

- Task title.
- Sent channel.
- Sent time.
- Status: sent, clicked, completed, snoozed, failed.

### Completion and Snooze

When a reminder is opened, the user can:

- Complete it.
- Snooze it.
- Keep it active.

Snooze should not ask for a date in MVP. It should use a fixed server policy: do not send the same reminder again for the next 24 hours.

## App Architecture

### Apps in Toss Mini-App

The mini-app owns:

- Registration flow.
- Consent capture.
- Reminder list.
- Inbox/history display.
- Completion/snooze actions.
- Local error states.
- Local browser fallback behavior.

The mini-app must not contain sending logic. It calls backend APIs.

### Backend Server

The backend owns:

- User identity mapping.
- Reminder persistence.
- SMS consent state.
- Send scheduling.
- Channel selection.
- Provider adapters.
- Send logs.
- Webhook/click tracking endpoints.
- Unsubscribe endpoint.

### Data Store

Use a relational schema with these core entities:

- `users`
- `notification_consents`
- `reminders`
- `reminder_events`
- `send_attempts`

This keeps compliance and debugging possible without an admin console.

## Channel Policy

### Toss Push First

The server should try Toss push when the user is eligible and the current moment is inside a platform-allowed sending window. The server must log why push was chosen, skipped, failed, or succeeded.

### SMS Fallback

SMS is used when:

- SMS consent is active.
- Phone number is verified or accepted by the MVP policy.
- The current time is inside the user's allowed window.
- The current time is outside night restriction.
- The user has not exceeded the daily SMS cap.
- Push is unavailable, skipped, or not expected to provide enough coverage.

### Fixed SMS Template

Use one fixed MVP template:

`[랜덤 리마인더] 미뤄둔 일을 다시 확인해보세요: {taskTitle}`

Unsubscribe guidance must be present where legally and operationally required by the SMS provider. Do not randomize wording.

## Random Policy

Randomness applies only to:

- Next send time.
- Channel choice when more than one channel is eligible.

Randomness never applies to:

- SMS content.
- Consent requirements.
- Night restrictions.
- Daily caps.
- Unsubscribe behavior.

### Intensity Mapping

- Gentle: one candidate send window per day.
- Normal: two candidate send windows per day.
- Strong: three candidate send windows per day.

The batch job should generate candidate sends from active reminders, then filter by consent, caps, night restriction, allowed time window, and snooze state.

## Safety Rules

- Do not send between 21:00 and 09:00 unless the user explicitly chooses a narrower allowed window that is still inside a future approved policy. MVP default is no night sending.
- Do not send more than 3 total reminders per user per day.
- Do not send more than 1 SMS per user per day in MVP.
- Do not send if SMS consent is inactive.
- Do not send to unsubscribed users.
- Do not send the same reminder within 24 hours after snooze.
- Do not block the user from completing a task if a send provider fails.

## Metrics

### Product Metrics

- Reminder creation count.
- First reminder delivery rate.
- Reminder open/click rate.
- Completion conversion rate.
- Snooze rate.
- SMS opt-in rate.
- SMS unsubscribe rate.
- 7-day return rate.

### Operational Metrics

- Send attempts by channel.
- Send failures by channel and reason.
- Skipped sends by reason.
- Daily sends per user.
- Batch duration.

## Error Handling

The app should show friendly local states:

- Failed to save reminder.
- Failed to load reminders.
- SMS consent required.
- Phone number invalid.
- Reminder already completed.

The server should store explicit failure reasons:

- `outside_allowed_window`
- `night_restricted`
- `daily_cap_reached`
- `sms_not_consented`
- `sms_unsubscribed`
- `provider_failed`
- `push_unavailable`
- `snoozed`

## Testing Strategy

- Unit-test random policy generation with deterministic seeded randomness.
- Unit-test cap and consent filtering.
- Unit-test channel choice.
- Unit-test API validation.
- Component-test the create reminder flow.
- Component-test list, inbox, complete, and snooze states.
- Manually test local browser flow at `http://localhost:53118/`.
- Build with `npm run build`.

## External Dependencies

The MVP needs provider credentials before real production sending:

- Toss push sending mechanism or approved notification integration.
- SMS provider credentials.
- Production database.
- Production scheduler or cron runner.

The code should isolate these behind provider adapters so development can proceed with a log-only adapter before credentials are available.

## Recommended First Build

Build the end-to-end skeleton first:

1. Mini-app screens for create/list/inbox.
2. Backend API with local database.
3. Log-only push and SMS adapters.
4. Batch scheduler endpoint.
5. Deterministic random policy tests.

Then replace log-only adapters with real providers after credentials and platform details are confirmed.

## Spec Review

- No placeholders remain.
- The MVP is focused on one user segment and one task family.
- The app/server boundary is explicit.
- Randomness is constrained to timing and channel choice.
- SMS risk is addressed through consent, fixed templates, caps, and unsubscribe behavior.
- Provider details are isolated because credentials and final platform integration are external launch dependencies.
