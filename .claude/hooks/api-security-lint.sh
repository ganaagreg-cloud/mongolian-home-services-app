#!/usr/bin/env bash
# Fires on PostToolUse Edit/Write for files under packages/api/src/routes/
# Uses Claude API to check: requireAuth order, parameterized queries, generic errors, no PII logging

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

# Only files under packages/api/src/routes/
if [[ "$FILE_PATH" != */packages/api/src/routes/* ]]; then
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
  echo "Warning: ANTHROPIC_API_KEY not set, skipping api-security-lint" >&2
  exit 0
fi

FILE_CONTENT=$(cat "$FILE_PATH" 2>/dev/null)
if [ -z "$FILE_CONTENT" ]; then
  exit 0
fi

PROMPT="You are a security reviewer for a Hono API codebase (packages/api/src/routes/). Check this route handler against exactly these four rules:

RULE 1 — requireAuth must be called before any business logic or DB query:
- The call to requireAuth(c) must appear before any db.query() call, any external fetch, or any data processing.
- Its return value must be checked for null and return 401 immediately.
- Violation example: db.query(...) appears before requireAuth(c), or null return is not checked

RULE 2 — All db.query() calls must use \$1/\$2/... placeholders, never string concatenation:
- Violation examples: db.query(\`WHERE id = \${id}\`), db.query('WHERE id = ' + id)
- Correct: db.query('WHERE id = \$1', [id])

RULE 3 — Catch blocks must return generic errors only:
- The catch block must return exactly: c.json({ error: 'Request failed' }, 500)
- Violation: returning e.message, e.stack, SQL text, or any internal detail in the error response

RULE 4 — Never log sensitive fields:
- Never call console.log, console.error, or console.warn with: password, token, registerNumber, imei, phoneNumber
- Violation: console.log('token:', token) or console.error({ password, userId })

FILE CONTENT:
\`\`\`ts
${FILE_CONTENT}
\`\`\`

List every violation with the line number and which rule (1/2/3/4) it breaks. Be specific. If there are no violations, output only the word: OK"

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

echo "API security violations in $FILE_PATH:" >&2
echo "$RESPONSE" >&2
exit 2
