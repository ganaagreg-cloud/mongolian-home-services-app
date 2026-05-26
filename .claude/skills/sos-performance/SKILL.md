---
description: Use when writing or editing the /api/sos route or any emergency alert handler. Triggered by tasks mentioning SOS, emergency alerts, or the /api/sos endpoint.
---

# SOS Performance Rules

## Hard Requirement

`/api/sos` must respond in **< 2 seconds**. This is a life-safety feature. No exceptions.

## Implementation Pattern

```ts
// app/api/sos/route.ts
export async function POST(req: Request) {
  try {
    const { userId } = await requireAuth(req)
    const body = SOSSchema.parse(await req.json())

    // 1. Persist the alert immediately — this is the only blocking operation
    await db.query(
      'INSERT INTO sos_alerts (user_id, location, created_at) VALUES ($1, $2, NOW())',
      [userId, body.location]
    )

    // 2. Return immediately — do NOT await notifications
    sendNotificationsAsync(userId, body).catch(console.error)  // fire-and-forget

    return Response.json({ received: true }, { status: 200 })

  } catch (e) {
    return Response.json({ error: 'Request failed' }, { status: 500 })
  }
}

// Runs after response is sent — never blocks the handler
async function sendNotificationsAsync(userId: number, body: SOSPayload) {
  // FCM push, SMS, admin notification — all async
}
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
return Response.json({ received: true })

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
