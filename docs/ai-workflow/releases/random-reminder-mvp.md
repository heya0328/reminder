# Random Reminder MVP Release Notes

## Local Run

1. Start backend:
   `cd server && npm run dev`

2. Start Apps in Toss app:
   `cd my-mini-app && npm run dev`

3. Open:
   `http://localhost:53118/`

## Local Ports

- Backend API: `http://127.0.0.1:53119`
- Granite: `http://localhost:53117`
- Vite app: `http://localhost:53118`

## External Launch Dependencies

- Run `docs/ai-workflow/supabase-schema.sql` in the Supabase SQL editor.
- Approved Toss push sending integration.
- SMS provider credentials.
- Production scheduler for `POST /api/batch/reminders`.
- SMS unsubscribe copy and compliance review.

## Current Provider Mode

The MVP currently uses Supabase for reminder persistence when `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are set. It still uses log-only push and SMS providers. They exercise the reminder policy, channel selection, send logs, and inbox without sending real notifications.
