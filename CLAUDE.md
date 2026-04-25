# Reminder Claude Guide

Use this alongside `AGENTS.md`.

## gstack

gstack is installed at `~/.claude/skills/gstack`.

For web browsing inside Claude Code, prefer the gstack `/browse` skill from gstack. Avoid raw browser MCP tools unless the user explicitly asks for a lower-level fallback.

Available gstack skills include:

- `/office-hours`
- `/plan-ceo-review`
- `/plan-eng-review`
- `/plan-design-review`
- `/design-consultation`
- `/design-shotgun`
- `/design-html`
- `/review`
- `/ship`
- `/land-and-deploy`
- `/canary`
- `/benchmark`
- `/browse`
- `/connect-chrome`
- `/qa`
- `/qa-only`
- `/design-review`
- `/setup-browser-cookies`
- `/setup-deploy`
- `/setup-gbrain`
- `/retro`
- `/investigate`
- `/document-release`
- `/codex`
- `/cso`
- `/autoplan`
- `/plan-devex-review`
- `/devex-review`
- `/careful`
- `/freeze`
- `/guard`
- `/unfreeze`
- `/gstack-upgrade`
- `/learn`

## Skill routing

When the user's request matches an available skill, invoke that workflow first.

- Product ideas, "is this worth building", brainstorming: use `/office-hours`.
- Bugs, errors, broken behavior: use `/investigate`.
- Ship, deploy, push, release: use `/ship` or `/land-and-deploy`.
- QA or visual testing: use `/qa`.
- Code review: use `/review`.
- Architecture review: use `/plan-eng-review`.
- Design polish: use `/design-review`.

## Project

- Main app: `my-mini-app/`
- Development ports:
  - Granite: `53117`
  - Vite: `53118`
- Verification:
  - `cd my-mini-app && npm run lint`
  - `cd my-mini-app && npm run build`

