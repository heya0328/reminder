#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: scripts/create-worktree.sh <short-feature-name>"
  exit 1
fi

feature_name="$1"
branch="codex/${feature_name}"
worktree_dir=".worktrees/${feature_name}"

git fetch origin main
git worktree add -b "$branch" "$worktree_dir" origin/main

cat <<MSG
Created worktree:
  branch: $branch
  path:   $worktree_dir

Next:
  cd $worktree_dir/my-mini-app
  npm install
  npm run dev
MSG
