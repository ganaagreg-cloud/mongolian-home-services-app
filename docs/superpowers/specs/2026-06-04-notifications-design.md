# Notifications — Sprint N.1 Design Spec

**Date:** 2026-06-04  
**Scope:** Infrastructure only — table, shared types, `notify()` service, 4 endpoints. No event wiring into existing handlers (Sprint N.2).

---

## Problem

The home screen has a hardcoded bell badge with "2". The profile "Мэдэгдэл" entry is a dead link. Users receive no feedback when their order status changes, when a chat message arrives, or when an admin broadcasts a message.

---

## Decisions (non-negotiable)

### 1. Render at read time — no stored strings

The `notifications` table stores `(type, metadata JSONB)` only. Mongolian title and body strings are rendered by the API at query time from a `renderNotification(type, metadata)` function. This keeps the DB clean of rendered locale strings and avoids stale copy in old rows when wording changes.

### 2. Typed notification enum — no free-form strings

`NotificationType` is a shared TS union in `@homeservices/shared`. The same values are listed in a Postgres `CHECK` constraint on the `type` column. Adding a new notification type requires updating the union, the check constraint (via schema re-run), and the render map — all in one place.

### 3. Watermark read state — no per-row flags

`notifications_read_at TIMESTAMPTZ` is added to the `users` table (nullable; null means never-read). Badge count = `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND created_at > $2`. Opening the screen fires `PATCH /api/me` with `{ notificationsReadAt: 'now' }`, which sets the watermark to `NOW()`. No per-row booleans; the watermark is O(1) to update regardless of notification count.

### 4. Composite index

`CREATE INDEX notifications_user_time ON notifications(user_id, created_at DESC)` — serves both the feed query (equality on user_id, order + limit on created_at) and the badge count (same columns in COUNT).

### 5. Single write path — `notify()`

All notification inserts go through `packages/api/src/lib/notifications.ts` which exports:

```ts
export async function notify(
  userId: number,
  type: NotificationType,
  metadata: NotificationMeta[typeof type]
): Promise<void>
```

Route handlers call `notify(...)`. They never write to the notifications table directly.

### 6. Best-effort, non-blocking

`notify()` catches all errors internally, logs a redacted summary (no PII), and returns without re-throwing. A notification failure must never roll back or 500 the primary action. Callers do not `await` the returned promise before sending their own response — fire-and-forget at the call site is acceptable.

**Never call `notify()` inside an escrow/payment DB transaction.** If the transaction rolls back, the notification would still have been sent, creating phantom notifications for failed payments.

**Never call `notify()` from the `/api/sos` path.** SOS must stay under 2 s; any non-essential I/O is forbidden there.

---

## Data Model

### New table: `notifications`

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN (
    'order_accepted', 'worker_on_the_way', 'order_completed',
    'order_cancelled', 'payment_confirmed', 'new_message', 'admin_broadcast'
  )),
  metadata   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_time
  ON notifications(user_id, created_at DESC);
```

`notifications` is immutable (no `updated_at`). Rows are append-only; never updated.

### Schema change: `users` table

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  notifications_read_at TIMESTAMPTZ DEFAULT NULL;
```

### Shared types (`@homeservices/shared`)

```ts
export type NotificationType =
  | 'order_accepted'
  | 'worker_on_the_way'
  | 'order_completed'
  | 'order_cancelled'
  | 'payment_confirmed'
  | 'new_message'
  | 'admin_broadcast'

export interface NotificationMeta {
  order_accepted:    { orderId: number; workerName: string }
  worker_on_the_way: { orderId: number; workerName: string }
  order_completed:   { orderId: number }
  order_cancelled:   { orderId: number; cancelledBy: 'user' | 'worker' }
  payment_confirmed: { orderId: number; amount: number }
  new_message:       { orderId: number; senderName: string }
  admin_broadcast:   { message: string }
}

export interface Notification {
  id: number
  userId: number
  type: NotificationType
  metadata: NotificationMeta[NotificationType]
  createdAt: string
  // rendered at read time:
  title: string
  body: string
}
```

---

## Rendering

`packages/api/src/lib/notifications.ts` exports a `renderNotification` function:

```ts
function renderNotification(type: NotificationType, metadata: unknown): { title: string; body: string }
```

Mongolian strings by type:

| type | title | body |
|------|-------|------|
| order_accepted | "Захиалга баталгаажлаа" | "{workerName} таны захиалгыг хүлээн авлаа" |
| worker_on_the_way | "Ажилтан явж байна" | "{workerName} замдаа гарлаа" |
| order_completed | "Захиалга дууслаа" | "Үйлчилгээ амжилттай дууслаа" |
| order_cancelled | "Захиалга цуцлагдлаа" | map: `user` → "Та захиалгыг цуцаллаа"; `worker` → "Ажилтан захиалгыг цуцаллаа" |
| payment_confirmed | "Төлбөр баталгаажлаа" | "₮{amount} амжилттай төлөгдлөө" |
| new_message | "Шинэ мессеж" | "{senderName} мессеж илгээлээ" |
| admin_broadcast | "Мэдэгдэл" | "{message}" |

---

## API Endpoints

All endpoints require authentication via `requireAuth(c)`.

### `GET /api/notifications`

Query param: `since` (ISO timestamp, optional cursor for pagination).

```
SELECT id, user_id, type, metadata, created_at
FROM notifications
WHERE user_id = $1
  AND ($2::timestamptz IS NULL OR created_at < $2)
ORDER BY created_at DESC
LIMIT 50
```

Response: `{ success: true, data: Notification[] }` (with rendered title/body appended).

### `GET /api/notifications/badge`

```
SELECT COUNT(*) AS count
FROM notifications
WHERE user_id = $1
  AND ($2::timestamptz IS NULL OR created_at > $2)
```

`$2` = the user's `notifications_read_at`. Returns `{ success: true, data: { count: number } }`.

### `PATCH /api/me` (extended)

Accept optional body field `notificationsReadAt: 'now'`. When present, runs:

```sql
UPDATE users SET notifications_read_at = NOW() WHERE id = $1
```

No other fields affected. Existing profile/mode-toggle logic unchanged.

### `POST /api/admin/broadcast`

Admin-only (`requireAdmin(c)`). Body: `{ message: string }`.

Inserts one notification row per user via a single batched INSERT:

```sql
INSERT INTO notifications (user_id, type, metadata)
SELECT id, 'admin_broadcast', $1::jsonb
FROM users
WHERE deleted_at IS NULL
```

`$1` = `JSON.stringify({ message })`. This is one DB round-trip regardless of user count. Returns `{ success: true, data: { count: number } }` (rowCount from INSERT).

---

## Polling Strategy

| Surface | Interval | Hook |
|---------|----------|------|
| Bell badge (global, always mounted in layout) | 30 s | `useEffect` interval, clears on unmount |
| Notifications screen (while open) | 30 s | same |
| Active order screens (searching, confirm, active-booking) | 3–5 s | component-local interval |
| Worker job offers screen | 3–5 s | component-local interval |
| Chat screen | 3–5 s | component-local interval |

All intervals are cleared `on unmount`. No global polling singleton — each component owns its timer.

---

## New route file

`packages/api/src/routes/notifications.ts` — mounted in `index.ts` as:

```ts
import notificationsRouter from './routes/notifications'
app.route('/', notificationsRouter)
```

---

## Out of Scope (Sprint N.1)

- Wiring `notify()` calls into existing handlers (`orders.ts`, `workers.ts`, etc.) — Sprint N.2
- Frontend notifications screen component — Sprint N.2
- Bell badge live polling hook — Sprint N.2
- Push notifications (FCM/APNS) — deferred indefinitely
- Per-user notification preferences / mute — deferred

---

## Future Architecture Notes

See `.claude/decisions/notifications.md` for:

- **Render-at-read tradeoff:** Pro: no stale strings in DB; Con: rendering cost per query (acceptable at MVP scale, trivial CPU).
- **Best-effort/non-blocking rule:** Why `notify()` must never throw into callers, and why payment transactions are excluded.
- **Broadcast fan-out concern:** At scale (10k+ users), a single `INSERT ... SELECT` is a large write. The escape hatch is a `broadcasts` table (one row per message) + `broadcast_dismissals` for per-user read state — avoids materialising N rows. Document the trigger: if `INSERT ... SELECT` blocks for >100 ms in staging, switch before launch.
- **Retention:** Prune notifications older than 90 days with a scheduled job (`DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '90 days'`). Not needed at MVP scale.

---

## Verification Steps

1. `pnpm exec tsc --noEmit` inside `packages/shared` — no errors
2. `pnpm exec tsc --noEmit` inside `packages/api` — no errors
3. `GET /api/notifications` with valid session → empty array (no rows yet)
4. `GET /api/notifications/badge` → `{ count: 0 }`
5. `POST /api/admin/broadcast` as admin → rows appear in notifications table
6. `GET /api/notifications/badge` after broadcast → `{ count: N }`
7. `PATCH /api/me` with `{ notificationsReadAt: 'now' }` → badge returns 0
8. `GET /api/notifications?since=<ts>` → only rows older than cursor
