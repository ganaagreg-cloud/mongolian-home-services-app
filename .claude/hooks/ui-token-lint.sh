#!/usr/bin/env bash
# Fires on PostToolUse Edit/Write for *.tsx files outside components/ui/
# Uses Claude API to check UI token rules from CLAUDE.md

set -euo pipefail

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | node -e "
let d='';
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
  try { const j = JSON.parse(d); console.log(j.tool_input?.file_path || ''); }
  catch { console.log(''); }
}" 2>/dev/null) || FILE_PATH=""

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only .tsx files
if [[ "$FILE_PATH" != *.tsx ]]; then
  exit 0
fi

# Skip shadcn primitives and vendored code
if [[ "$FILE_PATH" == *"/components/ui/"* || "$FILE_PATH" == *"/node_modules/"* || "$FILE_PATH" == *"/.next/"* ]]; then
  exit 0
fi

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "Warning: ANTHROPIC_API_KEY not set, skipping ui-token-lint" >&2
  exit 0
fi

FILE_CONTENT=$(cat "$FILE_PATH" 2>/dev/null)
if [ -z "$FILE_CONTENT" ]; then
  exit 0
fi

PROMPT="You are a UI token enforcer for a Mongolian home services mobile app. Read this TSX file and check it against these rules from .claude/skills/production-ui-design/SKILL.md (design system v2: teal + saffron):

COLOR RULES:
- Every action/CTA/selection/active state uses bg-primary / text-primary (brand teal). Booking CTAs are NOT saffron.
- Saffron (highlight) only for stars (fill-highlight text-highlight), count badges, eyebrow labels. Saffron TEXT must be text-highlight-strong.
- NEVER use accent as a brand color (bg-accent/text-accent are shadcn hover surfaces only).
- NEVER raw hex or gray-*/slate-* classes on structural elements; use bg-card, bg-background, text-foreground, text-muted-foreground, border-border.
- Service visuals use serviceTone()/serviceIcon() from lib/service-tone; people avatars use personTone().

SHAPE RULES:
- Hero cards rounded-3xl; cards rounded-2xl or rounded-[22px]; buttons/inputs rounded-2xl; chips/badges/icon buttons rounded-full.
- NEVER rounded-lg or rounded-md on cards/buttons/inputs.

ELEVATION RULES:
- Resting cards/inputs/icon buttons: shadow-card. Floating UI: shadow-float. Teal CTAs and teal hero cards: shadow-brand.
- NEVER shadow-sm, shadow-md, shadow-lg, shadow-xl or drop-shadow-* in new code.

MOTION RULES:
- Every tappable element (button, link styled as button) MUST have the pressable class.
- NEVER active:scale-95 or transition-all for press feedback.

LAYOUT RULES:
- Drill-down screens (not /home, /orders, /profile or worker tab roots) MUST have a back button.
- Fixed bottom CTAs sit at bottom-0 with safe-area padding; never offset upward to clear a tab bar.
- Primary CTA buttons h-14; icon buttons h-10 w-10.

ICON RULES:
- lucide-react icons only (BrandMark/GerGlyph is the only allowed inline SVG). NEVER emoji.

GROUPED LIST RULE:
- Items of the same group go inside ONE rounded-2xl bg-card overflow-hidden container with border-b border-border dividers.

FILE CONTENT:
\`\`\`tsx
${FILE_CONTENT}
\`\`\`

List every violation with the line number and which rule it breaks. Be specific and concise. If there are no violations, output only the word: OK"

# Build JSON payload with Node to avoid jq dependency
PAYLOAD=$(node -e "
const prompt = process.env.PROMPT_TEXT;
const payload = {
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: prompt }]
};
console.log(JSON.stringify(payload));
" 2>/dev/null) || { exit 0; }

RESPONSE=$(PROMPT_TEXT="$PROMPT" node -e "
const prompt = process.env.PROMPT_TEXT;
const payload = JSON.stringify({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: prompt }]
});
const { execSync } = require('child_process');
const result = execSync('curl -s https://api.anthropic.com/v1/messages -H \"Content-Type: application/json\" -H \"x-api-key: ' + process.env.ANTHROPIC_API_KEY + '\" -H \"anthropic-version: 2023-06-01\" -d ' + JSON.stringify(payload), { encoding: 'utf8' });
const parsed = JSON.parse(result);
console.log(parsed.content?.[0]?.text || 'OK');
" 2>/dev/null) || RESPONSE="OK"

if [ "$RESPONSE" = "OK" ]; then
  exit 0
fi

echo "UI token violations in $FILE_PATH:" >&2
echo "$RESPONSE" >&2
exit 2
