---
description: Use when writing or editing database schema (lib/db/schema.ts), seed data (lib/db/seed.ts), or any file that contains db.query() calls. Triggered by tasks involving tables, migrations, SQL queries, or data models.
---

# PostgreSQL Conventions

## Table Naming

- `snake_case` plural: `service_workers`, `bookings`, `damage_fund_entries`
- Never PascalCase, never singular, never camelCase

## Primary Keys

| Use case | Type | Example |
|----------|------|---------|
| Internal tables | `SERIAL` (integer autoincrement) | `id SERIAL PRIMARY KEY` |
| External tokens (share links, invite codes, session tokens) | `TEXT` or UUID | session token column |

**Rule:** Use `SERIAL` for every internal table PK. Only use TEXT/UUID for columns exposed externally where unguessability matters. Never use TEXT as a PK for internal tables.

## Required Columns

Every table must have:
```sql
created_at TIMESTAMP DEFAULT NOW() NOT NULL
```

Every mutable table must also have:
```sql
updated_at TIMESTAMP DEFAULT NOW() NOT NULL
```

## Soft Delete

- Never hard-delete user or worker records
- Add `deleted_at TIMESTAMP` (nullable) to any user/worker-facing table
- Filter with `WHERE deleted_at IS NULL` in all queries

```sql
-- Correct soft delete
UPDATE users SET deleted_at = NOW() WHERE id = $1

-- NEVER
DELETE FROM users WHERE id = $1
```

## Parameterized Queries — Always

```ts
// Correct
await db.query('SELECT * FROM bookings WHERE user_id = $1 AND status = $2', [userId, status])

// NEVER — SQL injection vector
await db.query(`SELECT * FROM bookings WHERE user_id = ${userId}`)
await db.query('SELECT * FROM bookings WHERE user_id = ' + userId)
```

## Money Values

- Store as `INTEGER` (MNT, no decimals)
- Column type: `INTEGER NOT NULL`
- In code: no floats, no `.toFixed()`, no `parseFloat()`

```ts
// Correct
const amount = 50000  // ₮50,000 MNT

// NEVER
const amount = 50000.00
const amount = parseFloat(rawAmount)
```

## Booleans

- Column type: `BOOLEAN` — never `INTEGER` with 0/1
- Pass `true`/`false` in query params — never `1`/`0`

```ts
// Correct
await db.query('UPDATE workers SET is_active = $1', [true])

// NEVER
await db.query('UPDATE workers SET is_active = $1', [1])
```

## Async/Await

- All queries are async: `await db.query(...)` — never block the event loop
- Never use `.then()` chains when `async/await` is available
- The Pool singleton is at `lib/db/index.ts`

## Schema Location

- DDL lives in `packages/api/src/db/schema.ts` — `CREATE TABLE IF NOT EXISTS`
- Seed data in `packages/api/src/db/seed.ts`
- DB pool singleton in `packages/api/src/db.ts`

## Anti-Patterns

```ts
// NEVER — string concatenation
db.query(`SELECT * FROM users WHERE phone = '${phone}'`)

// NEVER — float money
amount: 49999.99

// NEVER — integer boolean
db.query('UPDATE w SET active = $1', [1])

// NEVER — hard delete user record
db.query('DELETE FROM users WHERE id = $1', [id])

// NEVER — sync query (blocks event loop)
const result = db.query(...)   // missing await
```

## Pre-Submit Checklist

Before returning any DB-touching code, verify:

- [ ] Table name is `snake_case` plural
- [ ] Internal table PKs are `SERIAL`, not TEXT/UUID
- [ ] `created_at` on every table, `updated_at` on every mutable table
- [ ] User/worker records soft-deleted via `deleted_at`, never `DELETE`
- [ ] All queries use `$1/$2` placeholders — zero string concat
- [ ] Money values are integers (MNT), no floats
- [ ] Booleans stored as `BOOLEAN`, passed as `true`/`false`
- [ ] All `db.query()` calls are `await`-ed
