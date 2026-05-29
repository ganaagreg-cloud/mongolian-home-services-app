#!/usr/bin/env bash
# Fires on PostToolUse Edit/Write for *.ts / *.tsx files
# Hard gate: blocks if TypeScript reports any errors

set -euo pipefail

INPUT=$(cat)

# Extract file path using node (jq may not be installed)
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

# Only .ts and .tsx files
if [[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.tsx ]]; then
  exit 0
fi

# Skip vendored/generated files
if [[ "$FILE_PATH" == *"/node_modules/"* || "$FILE_PATH" == *"/.next/"* ]]; then
  exit 0
fi

# Find the nearest directory that has both tsconfig.json and package.json
# (i.e., the owning package root, not the monorepo root)
PROJECT_ROOT=$(git -C "$(dirname "$FILE_PATH")" rev-parse --show-toplevel 2>/dev/null || echo "$CLAUDE_PROJECT_DIR")

PKG_DIR=$(dirname "$FILE_PATH")
while [[ "$PKG_DIR" != "$PROJECT_ROOT" && "$PKG_DIR" != "/" ]]; do
  if [[ -f "$PKG_DIR/tsconfig.json" && -f "$PKG_DIR/package.json" ]]; then
    break
  fi
  PKG_DIR=$(dirname "$PKG_DIR")
done

# Fall back to project root if no package found
if [[ ! -f "$PKG_DIR/tsconfig.json" ]]; then
  PKG_DIR="$PROJECT_ROOT"
fi

cd "$PKG_DIR"

# pnpm exec resolves tsc from the package's own node_modules — avoids npx stub issues
TSC_OUTPUT=$(pnpm exec tsc --noEmit 2>&1) || {
  echo "TypeScript errors — fix before continuing:" >&2
  echo "$TSC_OUTPUT" >&2
  exit 2
}

exit 0
