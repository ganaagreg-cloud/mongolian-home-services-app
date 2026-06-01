---
description: Use when writing or editing the /api/sos route or any emergency alert handler. Triggered by tasks mentioning SOS, emergency alerts, or the /api/sos endpoint.
---

# SOS Performance Rules

## Hard Requirement

`/api/sos` must respond in **< 2 seconds**. This is a life-safety feature. No exceptions.

## Implementation Pattern

```ts
// packages/api/src/routes/sos.ts  (Hono router)
import { Hono } from 'hono'
import { requireAuth } from '../auth'
import { db, dbReady } from '../db'

const router = new Hono()

router.post('/api/sos', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ error: 'Request failed' }, 401)

  await dbReady

  let body: { orderId?: string; latitude?: number; longitude?: number } = {}
  try { body = await c.req.json() } catch { /* location is optional */ }

  // 1. Persist the alert immediately — this is the only blocking operation
  const { rows: [alert] } = await db.query<{ id: number }>(
    `INSERT INTO sos_alerts (triggered_by_id, order_id, latitude, longitude, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [Number(session.sub), body.orderId ?? null, body.latitude ?? null, body.longitude ?? null, session.role]
  )

  // 2. Return immediately — do NOT await notifications
  sendNotificationsAsync(Number(session.sub), alert.id).catch(console.error)

  return c.json({ success: true, data: { alertId: alert.id } })
})

// Runs after response is sent — never blocks the handler
async function sendNotificationsAsync(userId: number, alertId: number) {
  // FCM push, SMS, admin notification — all fire-and-forget
}

export default router
```

## Rules

1. **Persist first, respond immediately** — one INSERT is the maximum blocking work before the response
2. **Fire-and-forget notifications** — use `.catch(console.error)` to surface errors without blocking
3. **No external API calls before the response** — FCM, SMS, Slack — all after `return`
4. **No complex queries before the response** — no JOINs, no aggregations, no loops
5. **No heavy computation before the response** — no image processing, no PDF generation

## Anti-Patterns

```ts
// NEVER — awaiting notification before response
await sendFCMPush(userId)    // blocks!
await sendSMSAlert(phone)    // blocks!
return c.json({ success: true })

// NEVER — external API call before response
const adminList = await fetchAdminsFromExternalService()  // blocks!

// NEVER — complex query before response
const nearbyWorkers = await db.query(`
  SELECT * FROM workers
  JOIN service_areas ON ...
  WHERE ST_Distance(...) < 5000
`)   // could be slow!

// NEVER — any loop or heavy work before response
for (const admin of admins) {
  await notifyAdmin(admin)   // blocks for each admin!
}
```

## Pre-Submit Checklist

Before returning any SOS route code, verify:

- [ ] Only one INSERT (persist alert) happens before the response
- [ ] `return Response.json(...)` comes immediately after the INSERT
- [ ] All notifications (FCM, SMS, admin) are fire-and-forget after the return
- [ ] No external API calls block the response
- [ ] No JOINs or aggregation queries before the response
- [ ] No loops that await anything before the response
- [ ] Error in fire-and-forget is caught silently (`.catch(console.error)`) — does not crash
