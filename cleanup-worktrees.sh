#!/bin/bash
# Cleanup stale Claude Code worktrees
#
# Usage:
#   1. Close Claude Code Mac app first (this kills the live session)
#   2. Open Terminal
#   3. bash /Users/jamesji/site/bbcenter/cleanup-worktrees.sh
#
# Safety verified at script-creation time (2026-05-07):
#   - All 18 claude/* branches were at commit 84f2d42 (= main HEAD)
#   - unique_commits=0 for every branch → no work would be lost
#
# What this does:
#   - Removes all 18 worktrees under .claude/worktrees/ (including current session's)
#   - Force-deletes all claude/* branches
#   - Removes the app's worktree state file (app rebuilds it on next launch)

set -e

REPO=/Users/jamesji/site/bbcenter
STATE=/Users/jamesji/Library/Application\ Support/Claude/git-worktrees.json

cd "$REPO"

echo "==> Pre-check: app should be closed"
if pgrep -f "Claude Code" > /dev/null 2>&1; then
  echo "    WARNING: Claude Code app appears to still be running."
  echo "    Close the app first, then re-run this script."
  exit 1
fi

echo "==> Removing worktrees…"
WORKTREES=$(git worktree list --porcelain | awk '/^worktree / {print $2}' | grep '\.claude/worktrees/' || true)
for wt in $WORKTREES; do
  echo "    rm $wt"
  git worktree remove --force "$wt" 2>/dev/null || rm -rf "$wt"
done

echo "==> Pruning worktree metadata…"
git worktree prune

echo "==> Deleting claude/* branches…"
for b in $(git for-each-ref --format='%(refname:short)' refs/heads/claude/); do
  echo "    git branch -D $b"
  git branch -D "$b"
done

echo "==> Removing app state file…"
if [ -f "$STATE" ]; then
  mv "$STATE" "${STATE}.bak.$(date +%s)"
  echo "    backed up to ${STATE}.bak.<timestamp>"
fi

echo "==> Cleaning empty worktree directory…"
rmdir "$REPO/.claude/worktrees" 2>/dev/null || true

echo "==> Done."
echo ""
echo "Verify with:  git -C $REPO worktree list"
echo "(should show only the main repo)"
