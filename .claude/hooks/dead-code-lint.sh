#!/bin/bash
# Catches dead code patterns left behind after refactors

ERRORS=0

# Legacy JWT patterns outside lib/auth.ts
if grep -r "verifyToken\|signToken\|jwtVerify" \
   --include="*.ts" --include="*.tsx" \
   lib/ app/ 2>/dev/null \
   | grep -v "lib/auth.ts" \
   | grep -v "//"; then
  echo "ERROR: Legacy JWT code found. Remove it — use authClient instead."
  ERRORS=1
fi

# Calls to deprecated auth endpoints
if grep -r '"/api/auth/login\|/api/auth/register"' \
   --include="*.ts" --include="*.tsx" \
   components/ app/ 2>/dev/null \
   | grep -v "410\|deprecated\|//"; then
  echo "ERROR: Deprecated auth endpoint call found. Use authClient instead."
  ERRORS=1
fi

# router.push or useRouter in screen components (forbidden)
if grep -r "router\.push\|useRouter()" \
   --include="*.tsx" \
   components/screens/ 2>/dev/null \
   | grep -v "//"; then
  echo "ERROR: screens must use setCurrentScreen(), not router.push()."
  ERRORS=1
fi

exit $ERRORS
