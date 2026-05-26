---
description: Use when writing API routes, auth handlers, logging statements, file upload handlers, or any code that touches sensitive user data. Triggered by tasks involving authentication, user data, file handling, error responses, or any mention of security.
---

# Security Redaction Rules

## Never Log These Fields

These fields must NEVER appear in any `console.log`, `console.error`, `console.warn`, or logging call:

| Field | Why |
|-------|-----|
| `password` | Credential |
| `token` | Auth token |
| `registerNumber` | National ID (ДАН) |
| `imei` | Device identifier |
| `phoneNumber` | PII — worker phones must never reach clients |

```ts
// NEVER
console.log('User:', { phone: phoneNumber, token })
console.error('Auth failed:', { registerNumber, password })

// Correct — log only safe identifiers
console.log('User authenticated:', userId)
console.error('Auth failed for user:', userId)
```

## Generic Error Responses Only

API catch blocks must never expose internal details:

```ts
// Correct
} catch (e) {
  return Response.json({ error: 'Request failed' }, { status: 500 })
}

// NEVER — exposes stack trace
} catch (e) {
  return Response.json({ error: e.message, stack: e.stack })
}

// NEVER — exposes DB error
} catch (e) {
  return Response.json({ error: `DB error: ${e.message}` })
}

// NEVER — exposes SQL
} catch (e) {
  return Response.json({ error: `Query failed: SELECT * FROM users WHERE...` })
}
```

## Worker Phone Numbers

Worker phone numbers must **never** reach client users. Use platform chat only.

```ts
// NEVER in a worker listing or booking response
return Response.json({ worker: { name, phone: worker.phone_number } })

// Correct — omit phone from all client-facing responses
return Response.json({ worker: { id, name, rating, price_per_hour } })
```

## File Upload Rules

Enforce all three checks before processing:

```ts
// 1. MIME type — JPEG/PNG only
if (!['image/jpeg', 'image/png'].includes(file.type)) {
  return Response.json({ error: 'JPEG or PNG only' }, { status: 400 })
}

// 2. Size — max 5 MB
if (file.size > 5 * 1024 * 1024) {
  return Response.json({ error: 'File too large' }, { status: 413 })
}

// 3. Re-encode with sharp — never save raw upload buffer
const processed = await sharp(buffer).jpeg({ quality: 85 }).toBuffer()
```

## Parameterized Queries (Security Overlap)

Every DB query uses `$1/$2` placeholders — never string concatenation. This prevents SQL injection:

```ts
// Correct
await db.query('SELECT * FROM users WHERE phone = $1', [phone])

// NEVER — SQL injection
await db.query(`SELECT * FROM users WHERE phone = '${phone}'`)
```

## Auth on Every Route

Call `requireAuth(req)` before any business logic on every protected route. There are no exceptions.

## Anti-Patterns Summary

```ts
// NEVER
console.log(password, token, registerNumber, imei, phoneNumber)

// NEVER
catch (e) { return Response.json({ error: e.message }) }

// NEVER
return Response.json({ worker: { phone: worker.phone_number } })

// NEVER
await db.query(`WHERE id = ${userId}`)  // SQL injection

// NEVER
// skip requireAuth for "internal" endpoints
```

## Pre-Submit Checklist

Before returning any code that touches sensitive data, verify:

- [ ] No `console.log/error/warn` containing password, token, registerNumber, imei, or phoneNumber
- [ ] All catch blocks return `{ error: 'Request failed' }` — no raw error details
- [ ] Worker phone numbers not included in any client-facing API response
- [ ] File uploads check MIME type (JPEG/PNG only) and size (5 MB max) before processing
- [ ] File uploads re-encoded with `sharp` — raw buffer never saved
- [ ] All DB queries use `$1/$2` placeholders
- [ ] `requireAuth(req)` called on every protected route before business logic
