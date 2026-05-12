#!/usr/bin/env bash
# วัดขนาด entry docs vs token budget
# รัน: bash tools/doc-stats.sh
#
# Token estimate: ~3.5 chars/token (Thai+English+markdown mix)
# Budget guideline:
#   CLAUDE.md   ≤  2000 tokens (auto-loaded ทุก session)
#   INDEX.md    ≤  6000 tokens (โหลด ~80% task)
#   schema.md   ≤  8000 tokens (DB task)
#   อื่น ๆ      ≤  4000 tokens

set -eu

CHARS_PER_TOKEN=3.5

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# file:budget pairs (bash 3.2 compatible, no associative array)
ENTRIES="
CLAUDE.md|2000
docs/notes/INDEX.md|6000
docs/notes/database/schema.md|8000
docs/notes/architecture.md|4000
docs/notes/design_system.md|4000
docs/notes/task-lifecycle.md|4000
docs/notes/future_features.md|4000
app/migrations/migrations-index.md|4000
"

printf "| %-42s | %6s | %7s | %6s | %s\n" "File" "bytes" "tokens" "budget" "status"
printf "|%s|%s|%s|%s|%s\n" \
  "$(printf -- '-%.0s' {1..44})" \
  "$(printf -- '-%.0s' {1..8})" \
  "$(printf -- '-%.0s' {1..9})" \
  "$(printf -- '-%.0s' {1..8})" \
  "$(printf -- '-%.0s' {1..8})"

total_bytes=0
total_tokens=0
warnings=0

while IFS='|' read -r f budget; do
  [ -z "$f" ] && continue
  if [ ! -f "$f" ]; then
    printf "| %-42s | %6s | %7s | %6s | MISSING\n" "$f" "-" "-" "-"
    continue
  fi
  bytes=$(wc -c < "$f" | tr -d ' ')
  tokens=$(awk -v b="$bytes" -v c="$CHARS_PER_TOKEN" 'BEGIN { printf "%d", b/c }')
  warn_at=$(awk -v b="$budget" 'BEGIN { printf "%d", b*0.9 }')
  if [ "$tokens" -gt "$budget" ]; then
    status="OVER"
    warnings=$((warnings + 1))
  elif [ "$tokens" -gt "$warn_at" ]; then
    status="warn"
  else
    status="ok"
  fi
  printf "| %-42s | %6d | %7d | %6d | %s\n" "$f" "$bytes" "$tokens" "$budget" "$status"
  total_bytes=$((total_bytes + bytes))
  total_tokens=$((total_tokens + tokens))
done <<EOF
$ENTRIES
EOF

echo ""
echo "Total: $total_bytes bytes  ~$total_tokens tokens"

claude_b=$(wc -c < CLAUDE.md | tr -d ' ')
index_b=$(wc -c < docs/notes/INDEX.md | tr -d ' ')
schema_b=0
[ -f docs/notes/database/schema.md ] && schema_b=$(wc -c < docs/notes/database/schema.md | tr -d ' ')

cold=$(awk -v c="$claude_b" -v i="$index_b" -v r="$CHARS_PER_TOKEN" 'BEGIN { printf "%d", (c+i)/r }')
db=$(awk -v c="$claude_b" -v i="$index_b" -v s="$schema_b" -v r="$CHARS_PER_TOKEN" 'BEGIN { printf "%d", (c+i+s)/r }')
echo "Cold-start (CLAUDE+INDEX):  ~$cold tokens"
echo "DB task (+schema.md):        ~$db tokens"

if [ "$warnings" -gt 0 ]; then
  echo ""
  echo "WARN: $warnings file(s) over budget — split largest section"
  exit 1
fi
