# Reminder AI Development Guide

This repo uses an explicit product-to-release workflow for Apps in Toss work.

## Default Workflow

For new product ideas, ambiguous features, or anything that changes user behavior, follow this sequence before coding:

1. gstack `office-hours`
2. superpowers `brainstorming`
3. superpowers `writing-plans`
4. Git worktree creation
5. sub-agent-driven development

Do not skip directly to implementation unless the user explicitly asks for a small mechanical edit.

## Project Shape

- The Apps in Toss app lives in `my-mini-app/`.
- Run app commands from `my-mini-app/`.
- Local development ports are intentionally high to avoid conflicts:
  - Granite: `http://localhost:53117`
  - Vite app: `http://localhost:53118`
- Use Node 24+ for Apps in Toss builds.

## Apps in Toss Rules

- Read `my-mini-app/docs/skills/apps-in-toss.md` and `my-mini-app/docs/skills/tds-mobile.md` before implementing Apps in Toss features.
- Prefer official Apps in Toss MCP/docs over guesses.
- For non-game mini-app UI, use Toss Design System components first.
- Guard SDK calls with `isSupported()` checks, `try/catch`, and non-blocking fallbacks for local browser use.
- Keep implementation modular: pages, hooks, data, lib, types, constants.

## Planning Artifacts

- gstack office-hours design docs: `docs/ai-workflow/designs/`
- superpowers plans: `docs/superpowers/plans/`
- release notes and launch checklists: `docs/ai-workflow/releases/`

## Git Rules

- Keep `main` deployable.
- Create feature branches as `codex/<short-feature-name>`.
- Use worktrees for non-trivial features:
  - `scripts/create-worktree.sh <short-feature-name>`
- Make small commits at the end of each completed plan chunk.
- Before pushing, run at least:
  - `cd my-mini-app && npm run lint`
  - `cd my-mini-app && npm run build`

