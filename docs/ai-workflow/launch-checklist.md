# Apps in Toss Launch Checklist

Use this checklist before requesting review or release.

## Product

- Design doc approved.
- Implementation plan approved.
- Narrow first release scope is clear.
- Success criteria are testable.

## Apps in Toss

- `granite.config.ts` `appName` matches the Apps in Toss console.
- Brand display name, primary color, and icon are set.
- Required permissions are declared in `granite.config.ts`.
- No undeclared SDK permissions are used.
- Local browser fallbacks exist for SDK-only behavior.
- Pinch zoom is disabled.
- No custom navigation bar conflicts with SDK navigation.
- No external redirect or app install inducement exists unless allowed.

## UI

- TDS components are used for non-game UI.
- Text fits on mobile.
- Loading, empty, error, and success states are covered.
- Back behavior is explicit and tested.

## Quality

- `npm run lint` passes.
- `npm run build` passes.
- Main user flow is tested in local browser.
- Main user flow is tested in Toss/QR environment when credentials are available.
- Bundle size is acceptable.

## Release

- Commit history is clean enough to review.
- Release notes are written.
- Deployment API key/profile is configured locally, not committed.
- `npm run deploy` is run only after final confirmation.

## Random Reminder

- SMS consent text reviewed.
- SMS unsubscribe path tested.
- Daily SMS cap tested.
- Night restriction tested.
- Push unavailable fallback tested.
- Provider failures do not block app usage.
