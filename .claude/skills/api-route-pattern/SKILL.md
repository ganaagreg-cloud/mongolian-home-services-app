---
description: Use when writing, editing, or reviewing any Hono route handler under packages/api/src/routes/. Triggered by tasks like "add an API endpoint", "fix a route handler", "create an API for X", or any file path matching packages/api/src/routes/**/*.ts.
---

# API Route Pattern

Every route handler in this project follows a strict five-step shape. Deviate from any step and the hook will block the commit.

## The Five Steps (in order)

```ts
// Step 1 — Validate input with Zod
const body = BodySchema.parse(await c.req.json())   // throws ZodError → 400

// Step 2 — Authenticate the caller
const session = await requireAuth(c)                 // returns null → 401
if (!session) return c.json({ error: 'Request failed' }, 401)

// Step 3 — Verify resource ownership
const row = await db.query('SELECT user_id FROM orders WHERE id = $1', [id])
if (row.rows[0]?.user_id !== Number(session.sub)) return c.json({ error: 'Request failed' }, 403)

// Step 4 — Parameterized query only
await db.query('INSERT INTO ... ($1, $2)', [val1, val2])  // NEVER string concat

// Step 5 — Generic error response in catch
} catch (e) {
  return c.json({ error: 'Request failed' }, 500)
}
```

## Hono Router Pattern

Routes live in `packages/api/src/routes/<domain>.ts` and are mounted in `packages/api/src/index.ts`.

```ts
import { Hono } from 'hono'
import { requireAuth } from '../auth'
import { db } from '../db'

const router = new Hono()

router.post('/api/domain/:id', async (c) => {
  // five steps here
})

export default router
```

In `packages/api/src/index.ts`:
```ts
import domainRouter from './routes/domain'
app.route('/', domainRouter)
```

## Auth Rules

- `requireAuth(c)` from `packages/api/src/auth.ts` — call it before ANY business logic
- Returns `SessionPayload | null` — check for null and return 401 immediately
- `session.sub` is the user's DB id as a string — coerce with `Number(session.sub)` when comparing to DB integer columns
- Use `requireAdmin(c)` for admin-only endpoints; it calls `requireAuth` internally

## Error Response Rules

- All catch blocks: `return c.json({ error: 'Request failed' }, 500)`
- Never expose: stack traces, DB error messages, SQL, internal field names
- Validation errors (ZodError): status 400, message can describe the field
- Auth errors: status 401
- Ownership/authorization failures: status 403

## Ownership Verification Pattern

After `requireAuth`, always confirm the caller owns the resource:
```ts
const result = await db.query('SELECT user_id FROM bookings WHERE id = $1', [bookingId])
if (!result.rows[0] || result.rows[0].user_id !== Number(session.sub)) {
  return c.json({ error: 'Request failed' }, 403)
}
```
Admin role bypasses ownership check; worker role checks `worker_id` not `user_id`.

## Zod Validation Rules

- Define schema above the handler: `const Schema = z.object({ ... })`
- Parse request body before `requireAuth`: fail fast on malformed input
- For path params: validate with `z.coerce.number().int().positive()`
- Return 400 on ZodError: wrap parse in try/catch or use `.safeParse()`

## File Upload Rules

- Accept JPEG/PNG only — reject other MIME types with 400
- Max 5 MB — reject larger files with 413
- Re-encode with `sharp` before storing — never save the raw upload buffer

## Route File Locations

```
packages/api/src/routes/
  auth.ts           # /api/auth/* — Better Auth catch-all + /me + /dan
  me.ts             # GET/PATCH /api/me — profile + mode toggle
  orders.ts         # /api/orders — CRUD, match, accept, decline, upload, review
  workers.ts        # /api/workers — list, register, [id], me, availability, banking
  admin.ts          # /api/admin — stats, disputes, worker verification
  payments.ts       # /api/payments — create-invoice (QPay V2 mock), dev-sim-pay
  sos.ts            # /api/sos — emergency alert (< 2s)
  disputes.ts       # /api/disputes — dispute management
  service-types.ts  # /api/service-types — master data
```

## Anti-Patterns

```ts
// NEVER — string concatenation in queries
db.query(`SELECT * FROM users WHERE id = ${userId}`)

// NEVER — expose stack trace
catch (e) { return c.json({ error: e.message, stack: e.stack }) }

// NEVER — business logic before requireAuth
const data = await db.query(...)   // no auth yet!
const session = await requireAuth(c)

// NEVER — skip ownership check
const session = await requireAuth(c)
const order = await db.query('SELECT * FROM orders WHERE id = $1', [id])
// missing: if (order.rows[0].user_id !== Number(session.sub)) → 403

// NEVER — log sensitive fields
console.log('User token:', token)
console.log('Phone:', phoneNumber)

// NEVER — create app/api/ inside packages/web or packages/admin
// All API logic belongs in packages/api/src/routes/
```

## Pre-Submit Checklist

Before returning any API route code, verify:

- [ ] Zod schema defined and `.parse()` called before `requireAuth`
- [ ] `requireAuth(c)` is the second call, before any DB query
- [ ] `null` return from `requireAuth` is checked and returns 401 immediately
- [ ] Every query that touches a user-owned resource has an ownership check
- [ ] All `db.query()` calls use `$1/$2/...` placeholders — zero string concatenation
- [ ] Every catch block returns `{ error: 'Request failed' }` — no raw error exposure
- [ ] No `console.log` of password, token, registerNumber, imei, or phoneNumber
- [ ] File uploads: JPEG/PNG only, 5 MB max, re-encode with sharp
- [ ] Route file is under `packages/api/src/routes/` in the correct domain file

See `references/route-template.ts` for a complete working example.
