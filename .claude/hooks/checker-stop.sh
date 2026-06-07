#!/usr/bin/env bash
# Stop hook: remind to run `checker` ONLY when the app-code diff has changed
# since the last reminder. Without the hash gate, `git diff HEAD` matches the
# same uncommitted edits every turn → the reminder fires forever (loop).
cd /Users/jamesji/site/bbcenter || exit 0

files=$(git diff --name-only HEAD 2>/dev/null | grep -E '^app/.*\.(py|html|css|js)$')
[ -z "$files" ] && exit 0

h=$(git diff HEAD -- $files 2>/dev/null | shasum | awk '{print $1}')
state=/tmp/bbcenter-checker-last

# Same diff as last reminder → already verified, stay quiet.
[ "$(cat "$state" 2>/dev/null)" = "$h" ] && exit 0

echo "$h" > "$state"
jq -cn '{hookSpecificOutput:{hookEventName:"Stop",additionalContext:"🤖 [auto] Code changed since last verified — spawn the `checker` subagent to verify docs sync per CLAUDE.md Maintenance Protocol before ending."}}'
