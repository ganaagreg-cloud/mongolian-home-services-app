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

PROMPT="You are a UI token enforcer for a Mongolian home services mobile app. Read this TSX file and check it against these rules extracted from the project's CLAUDE.md:

BORDER RADIUS RULES:
- Cards, panels, banners: rounded-2xl (NEVER rounded-lg or rounded-xl)
- Primary buttons, inputs: rounded-2xl (NEVER rounded-lg)
- Icon square containers: rounded-xl (OK)
- Icon circular buttons: rounded-full (OK)
- Filter chips, badges: rounded-full (OK)

SPACING RULES:
- Horizontal gutter: px-6 on every section
- Full-width card wrappers: mx-6
- Top of page safe-area: pt-12
- Between major sections: mt-6
- Page with fixed bottom nav: pb-24
- Page with fixed bottom CTA button: pb-32

HEIGHT RULES:
- Primary CTA buttons: h-14
- Search inputs, phone inputs: h-12
- Icon circle/square buttons: h-10 w-10

SHADOW RULES:
- Cards/inputs/buttons rest state: shadow-sm
- Active selection, elevated buttons: shadow-md
- Gradient hero cards: shadow-lg
- NEVER: shadow-xl, drop-shadow-*

INTERACTIVE STATES:
- Every tappable element (button, clickable div) MUST have: active:scale-95 transition-all

COLOR TOKEN RULES:
- NEVER use raw gray-*, slate-* classes on structural elements (cards, borders, text labels)
- Use semantic tokens: bg-card, text-foreground, text-muted-foreground, border-border
- Icon containers: bg-primary/10 text-primary
- Booking CTAs: bg-accent (orange)
- Active/selected states: bg-primary (blue)

ICON RULES:
- All icons from lucide-react (NEVER emoji, NEVER inline SVG)
- Inline/nav: h-5 w-5
- Star rating: h-3.5 w-3.5 fill-accent text-accent

GROUPED LIST RULE:
- List items in the same group go inside ONE rounded-2xl bg-card overflow-hidden container with border-b border-border dividers
- NEVER individual cards per list item in the same group

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
