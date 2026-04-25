# AI Workflow

This project is set up to move from service planning to Apps in Toss launch with a repeatable AI-assisted flow.

## Flow

1. **gstack office-hours**
   - Clarify whether the idea is worth building.
   - Save a design doc under `docs/ai-workflow/designs/`.

2. **superpowers brainstorming**
   - Turn the idea into an approved design/spec.
   - No implementation until the design is approved.

3. **superpowers writing-plans**
   - Convert the approved spec into chunked implementation tasks.
   - Save plans under `docs/superpowers/plans/`.

4. **Git worktrees**
   - Create isolated feature worktrees with `scripts/create-worktree.sh`.
   - Keep `main` clean while multiple features are in progress.

5. **sub-agent dev**
   - Use sub-agents for bounded implementation chunks.
   - Review each chunk, run checks, commit, then continue.

## Installed Skills

- gstack: `~/.claude/skills/gstack`
- Codex gstack office-hours bridge: `~/.codex/skills/office-hours`
- superpowers brainstorming: `~/.codex/skills/brainstorming`
- superpowers writing-plans: `~/.codex/skills/writing-plans`
- superpowers using-git-worktrees: `~/.codex/skills/using-git-worktrees`
- superpowers subagent-driven-development: `~/.codex/skills/subagent-driven-development`

Restart Codex after installing or updating skills so newly installed skills appear in the active skill list.

## Apps in Toss Commands

Run from `my-mini-app/`:

```bash
npm run dev
npm run lint
npm run build
```

Current local ports:

- Granite server: `53117`
- Vite app: `53118`

