---
description: Use when writing, editing, or reviewing any Next.js API route handler under app/api/. Triggered by tasks like "add an API endpoint", "fix a route handler", "create an API for X", or any file path matching app/api/**/*.ts.
---

# API Route Pattern

Every route handler in this project follows a strict five-step shape. Deviate from any step and the hook will block the commit.

## The Five Steps (in order)

```ts
// Step 1 — Validate input with Zod
const body = BodySchema.parse(await req.json())   // throws ZodError → 400

// Step 2 — Authenticate the caller
const { userId, role } = await requireAuth(req)   // throws → 401

// Step 3 — Verify resource ownership
const row = await db.query('SELECT user_id FROM orders WHERE id = $1', [id])
if (row.rows[0]?.user_id !== userId) return Response.json({ error: 'Request failed' }, { status: 403 })

// Step 4 — Parameterized query only
await db.query('INSERT INTO ... ($1, $2)', [val1, val2])  // NEVER string concat

// Step 5 — Generic error response in catch
} catch (e) {
  return Response.json({ error: 'Request failed' }, { status: 500 })
}
```

## Auth Rules

- `requireAuth(req)` from `lib/auth.ts` — call it before ANY business logic
- Returns `{ userId, role }` — use `role` to gate admin/worker-only endpoints
- Unauthenticated requests must receive exactly `{ error: 'Request failed' }` with status 401

## Error Response Rules

- All catch blocks: `return Response.json({ error: 'Request failed' }, { status: 500 })`
- Never expose: stack traces, DB error messages, SQL, internal field names
- Validation errors (ZodError): status 400, message can describe the field
- Auth errors: status 401
- Ownership/authorization failures: status 403

## Ownership Verification Pattern

After `requireAuth`, always confirm the caller owns the resource:
```ts
const result = await db.query('SELECT user_id FROM bookings WHERE id = $1', [bookingId])
if (!result.rows[0] || result.rows[0].user_id !== userId) {
  return Response.json({ error: 'Request failed' }, { status: 403 })
}
```
Admin role bypasses ownership check; worker role checks `worker_id` not `user_id`.

## Zod Validation Rules

- Define schema above the handler: `const Schema = z.object({ ... })`
- Parse request body before `requireAuth`: fail fast on malformed input
- For path params (dynamic routes): validate with `z.coerce.number().int().positive()`
- Return 400 on ZodError: wrap parse in try/catch or use `.safeParse()`

## File Upload Rules

- Accept JPEG/PNG only — reject other MIME types with 400
- Max 5 MB — reject larger files with 413
- Re-encode with `sharp` before storing — never save the raw upload buffer

## Route File Locations

```
app/api/
  auth/           # send-otp, verify-otp, login, register, logout, me, dan, test-login
  orders/         # CRUD + match, accept, decline, upload, review, status
  workers/        # list, register, [id], me, me/availability, me/banking
  admin/          # stats, disputes, workers/pending, workers/[id]/verify
  payments/       # create-invoice (QPay V2 mock), dev-sim-pay
  sos/            # emergency alert
```

## Anti-Patterns

```ts
// NEVER — string concatenation in queries
db.query(`SELECT * FROM users WHERE id = ${userId}`)

// NEVER — expose stack trace
catch (e) { return Response.json({ error: e.message, stack: e.stack }) }

// NEVER — business logic before requireAuth
const data = await db.query(...)   // no auth yet!
const { userId } = await requireAuth(req)

// NEVER — skip ownership check
const { userId } = await requireAuth(req)
const order = await db.query('SELECT * FROM orders WHERE id = $1', [id])
// missing: if (order.rows[0].user_id !== userId) → 403

// NEVER — log sensitive fields
console.log('User token:', token)
console.log('Phone:', phoneNumber)
```

## Pre-Submit Checklist

Before returning any API route code, verify:

- [ ] Zod schema defined and `.parse()` called before `requireAuth`
- [ ] `requireAuth(req)` is the second call, before any DB query
- [ ] Every query that touches a user-owned resource has an ownership check
- [ ] All `db.query()` calls use `$1/$2/...` placeholders — zero string concatenation
- [ ] Every catch block returns `{ error: 'Request failed' }` — no raw error exposure
- [ ] No `console.log` of password, token, registerNumber, imei, or phoneNumber
- [ ] File uploads: JPEG/PNG only, 5 MB max, re-encode with sharp
- [ ] Route file is under `app/api/` in the correct subdirectory

See `references/route-template.ts` for a complete working example.
