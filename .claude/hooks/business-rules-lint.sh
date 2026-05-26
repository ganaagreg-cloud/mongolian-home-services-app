#!/usr/bin/env bash
# Fires on PostToolUse Edit/Write for files under app/api/ or lib/
# Uses Claude API to check critical business rules from CLAUDE.md

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

# Only files under app/api/ or lib/
if [[ "$FILE_PATH" != */app/api/* && "$FILE_PATH" != */lib/* ]]; then
  exit 0
fi

# Only .ts files
if [[ "$FILE_PATH" != *.ts ]]; then
  exit 0
fi

if [[ "$FILE_PATH" == *"/node_modules/"* ]]; then
  exit 0
fi

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "Warning: ANTHROPIC_API_KEY not set, skipping business-rules-lint" >&2
  exit 0
fi

FILE_CONTENT=$(cat "$FILE_PATH" 2>/dev/null)
if [ -z "$FILE_CONTENT" ]; then
  exit 0
fi

PROMPT="You are a business rules enforcer for a Mongolian home services platform. Check this code against exactly these four business rules:

RULE 1 — Cash payments are forbidden. All money must go through Escrow:
- Violation: any code path that allows a booking to be marked paid/completed without going through the escrow/QPay payment flow
- Look for: status updates to 'completed' or 'paid' without a corresponding payment record check

RULE 2 — Money values must be integers in MNT (Mongolian Tugrik). No floats, no decimals:
- Violation: parseFloat(), toFixed(), any decimal literal for a money amount (e.g. 49999.99, 0.15)
- Exception: commission calculation is OK as intermediate float IF the final stored value is Math.round()'d to an integer
- Look for: storing or returning non-integer money values

RULE 3 — /api/sos must never have blocking logic before the response:
- This rule ONLY applies if the file path contains '/api/sos'
- Violation: any await call (external API, notification, complex query) that happens BEFORE the Response.json() return
- Correct pattern: INSERT alert → return response immediately → fire-and-forget notifications after

RULE 4 — Worker phone numbers must never be returned in API responses:
- Violation: any Response.json() or return object that includes a phone_number, phoneNumber, or phone field from a worker/service_worker record
- Look for: spreading worker objects or selecting phone columns in worker-facing query results

FILE CONTENT:
\`\`\`ts
${FILE_CONTENT}
\`\`\`

List every violation with the line number and which rule (1/2/3/4) it breaks. Be specific and cite the exact code. If there are no violations, output only the word: OK"

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

echo "Business rule violations in $FILE_PATH:" >&2
echo "$RESPONSE" >&2
exit 2
