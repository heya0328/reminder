# Random Reminder Office-Hours Notes

## Chosen Wedge

Random Reminder is for people who keep postponing small but important life-admin tasks.

It is not a general reminder app. It is a controlled random re-exposure system for tasks that users already know they should do, but keep avoiding.

## Decisions

- Target: people delaying personal life-admin tasks.
- First use case: 병원 예약, 서류 제출, 구독 해지, 택배 반품, 고객센터 연락.
- Registration flow: task title, allowed time window, random intensity.
- Channels: Toss push plus SMS.
- Channel strategy: Toss push first, SMS fallback.
- Server scope: minimum real sending server.

## Hardest Assumption

The riskiest assumption is not that random reminders are memorable. The riskiest assumption is that users will feel helped rather than bothered.

The MVP must prove that controlled randomness can create action without creating notification fatigue.

## Recommended MVP

Build a minimum real-sending MVP:

- Apps in Toss mini-app for registration, consent, status, completion, and snooze.
- Backend for reminders, scheduling, channel selection, send logs, caps, and unsubscribe.
- Fixed SMS templates.
- Strict day/night and daily cap rules.
- Log-only provider adapters first, real push/SMS providers second.
