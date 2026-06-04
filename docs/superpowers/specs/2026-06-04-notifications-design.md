# Notifications — Sprint N.1 Design Spec

**Date:** 2026-06-04 (rev: N.1-fix)
**Scope:** Infrastructure only — table, shared types, `notify()` service, 4 endpoints. Event wiring into existing handlers is Sprint N.2.

---

## Problem

The home screen has a hardcoded bell badge with "2". The profile "Мэдэгдэл" entry is a dead link. Users receive no feedback when their order status changes, when a chat message arrives, or when an admin broadcasts a message.

---

## Decisions (non-negotiable)

### 1. Render at read time — no stored strings

The `notifications` table stores `(type, metadata JSONB)` only. Mongolian title and body strings are rendered by the API at query time from `renderNotification()`. Stored rows never contain locale strings, so copy changes don't require data migrations.

### 2. Typed notification enum — no free-form strings

`NotificationType` is a shared TS union in `@homeservices/shared`. The same values appear in a Postgres `CHECK` constraint on the `type` column. Adding a new notification type requires updating the union, rebuilding shared, and updating the CHECK constraint (via schema re-run) and the render map — all in one place.

`new_message` is excluded. The chat screen polls at 3–5 s while mounted; adding a separate feed row per message would cause write amplification and feed flooding. Chat delivery is owned by the chat poll.

### 3. Watermark read state — no per-row flags

`notifications_read_at TIMESTAMPTZ` is added to the `users` table (nullable; null means "never read, all are unread"). Badge count = `COUNT(*) WHERE user_id=$1 AND ($2 IS NULL OR created_at > $2)`. Opening the notifications screen fires `PATCH /api/me` with `{ markNotificationsRead: true }`; the server sets `notifications_read_at = NOW()`. No per-row booleans; the watermark is O(1) to update regardless of row count.

The client always sends `markNotificationsRead: true` (a boolean). The server ignores any client-supplied timestamp and always uses `NOW()`.

### 4. Composite index

```sql
CREATE INDEX IF NOT EXISTS notifications_user_time
  ON notifications(user_id, created_at DESC)
```

Serves both the feed query (equality on user_id, order + limit on created_at) and the badge COUNT (same two columns).

### 5. Single write path — `notify()`

All inserts go through `packages/api/src/lib/notifications.ts`:

```ts
export async function notify<T extends NotificationType>(
  userId: number,
  type: T,
  metadata: NotificationMeta[T],
): Promise<void>
```

The generic constraint ensures callers cannot pass a metadata shape that doesn't match the declared type. Route handlers call `notify(...)` directly; they never touch the notifications table.

### 6. Type-safe rendering

`renderNotification` accepts a discriminated union input, not `metadata: unknown`:

```ts
type NotificationInput = {
  [T in NotificationType]: { type: T; metadata: NotificationMeta[T] }
}[NotificationType]

export function renderNotification(input: NotificationInput): { title: string; body: string }
```

Inside the function, a `switch` on `input.type` narrows `input.metadata` to the correct shape for each branch. TypeScript catches missing cases at compile time.

### 7. Best-effort, non-blocking

`notify()` catches all errors internally, logs a redacted summary (no PII), and returns without re-throwing. A notification failure must never roll back or 500 the primary action.

**Never call `notify()` inside an escrow/payment DB transaction.** A rolled-back transaction would still have fired the notification, creating phantom notifications for failed payments.

**Never call `notify()` from the `/api/sos` path.** SOS must stay under 2 s; no non-essential I/O is permitted there.

---

## Data Model

### New table: `notifications`

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN (
    'order_accepted', 'worker_on_the_way', 'order_completed',
    'order_cancelled', 'payment_confirmed', 'admin_broadcast'
  )),
  metadata   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_time
  ON notifications(user_id, created_at DESC);
```

Rows are immutable (append-only). No `updated_at`.

### Schema change: `users` table

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  notifications_read_at TIMESTAMPTZ DEFAULT NULL;
```

`users.deleted_at` already exists (confirmed in schema.ts); the broadcast query can safely filter `WHERE deleted_at IS NULL`.

### Shared types (`@homeservices/shared`)

```ts
export type NotificationType =
  | 'order_accepted'
  | 'worker_on_the_way'
  | 'order_completed'
  | 'order_cancelled'
  | 'payment_confirmed'
  | 'admin_broadcast'

export interface NotificationMeta {
  order_accepted:    { orderId: number; workerName: string }
  worker_on_the_way: { orderId: number; workerName: string }
  order_completed:   { orderId: number }
  order_cancelled:   { orderId: number; cancelledBy: 'user' | 'worker' }
  payment_confirmed: { orderId: number; amount: number }
  admin_broadcast:   { message: string }
}

// Discriminated union — narrowing `type` also narrows `metadata`
export type Notification = {
  [T in NotificationType]: {
    id: number
    userId: number
    type: T
    metadata: NotificationMeta[T]
    createdAt: string
    title: string   // rendered at read time
    body: string    // rendered at read time
  }
}[NotificationType]
```

---

## Rendering

`renderNotification(input: NotificationInput)` maps type → Mongolian strings:

| type | title | body |
|------|-------|------|
| order_accepted | "Захиалга баталгаажлаа" | "{workerName} таны захиалгыг хүлээн авлаа" |
| worker_on_the_way | "Ажилтан явж байна" | "{workerName} замдаа гарлаа" |
| order_completed | "Захиалга дууслаа" | "Үйлчилгээ амжилттай дууслаа" |
| order_cancelled | "Захиалга цуцлагдлаа" | `cancelledBy === 'user'` → "Та захиалгыг цуцаллаа"; `'worker'` → "Ажилтан захиалгыг цуцаллаа" |
| payment_confirmed | "Төлбөр баталгаажлаа" | "₮{amount} амжилттай төлөгдлөө" |
| admin_broadcast | "Мэдэгдэл" | "{message}" |

`new_message` is not in the type union — chat delivery is handled by the chat screen's own 3–5 s poll.

---

## API Endpoints

All endpoints require `requireAuth(c)`.

### `GET /api/notifications?before=<ISO timestamp>`

Cursor param is `before` (not `since`) — the query does `created_at < cursor`, so "before" is correct. An invalid timestamp returns 400.

```sql
SELECT id, user_id, type, metadata, created_at
FROM notifications
WHERE user_id = $1
  AND ($2::timestamptz IS NULL OR created_at < $2)
ORDER BY created_at DESC
LIMIT 50
```

Response: `{ success: true, data: Notification[], hasMore: boolean }`.
`hasMore = data.length === 50` — client uses `data[data.length-1].createdAt` as next cursor.

### `GET /api/notifications/badge`

Reads `notifications_read_at` from `users` (one query), then counts unread (one query):

```sql
SELECT COUNT(*) AS count
FROM notifications
WHERE user_id = $1
  AND ($2::timestamptz IS NULL OR created_at > $2)
```

`$2 IS NULL` covers the "never opened notifications" case (all rows count as unread).
Response: `{ success: true, data: { count: number } }`.

### `PATCH /api/me` (extended)

New optional field: `markNotificationsRead: boolean`. When `true`, the server appends `notifications_read_at = NOW()` to the dynamic SET clause — no client-supplied timestamp is ever trusted. The existing fields (name, email, etc.) are unchanged.

### `POST /api/admin/broadcast`

`requireAdmin(c)`. Body validated with Zod: `{ message: string }` (min 1, max 500 chars).

```sql
INSERT INTO notifications (user_id, type, metadata)
SELECT id, 'admin_broadcast', $1::jsonb
FROM users
WHERE deleted_at IS NULL
```

One DB round-trip regardless of user count.
Response: `{ success: true, data: { count: number } }`.

---

## Polling Strategy

| Surface | Interval | Behaviour |
|---------|----------|-----------|
| Bell badge (always mounted in layout) | 30 s | `useEffect` interval, cleared on unmount |
| Notifications screen (while open) | 30 s | same |
| Active order screens (searching, confirm, active-booking) | 3–5 s | component-local interval |
| Worker job offers screen | 3–5 s | component-local interval |

All intervals clear on unmount. No global polling singleton. No SSE for MVP.

Migration trigger to Redis pub/sub + SSE: document in `.claude/decisions/notifications.md` once the 30 s poll latency is observed to cause UX problems under load.

---

## New route file

`packages/api/src/routes/notifications.ts` — mounted in `index.ts` as `app.route('/', notificationsRouter)`, matching the `/api/` prefix convention of all other routers.

---

## Out of Scope (Sprint N.1)

- Wiring `notify()` calls into existing handlers (`orders.ts`, `workers.ts`, etc.) — Sprint N.2
- Frontend notifications screen component — Sprint N.2
- Bell badge live polling hook — Sprint N.2
- Push notifications (FCM/APNS) — deferred
- Per-user notification preferences / mute — deferred

---

## Future Architecture Notes

See `.claude/decisions/notifications.md`:

- **Render-at-read tradeoff:** Rendering strings per-query is trivial CPU at MVP scale. If row volume grows past ~100k, add a DB function or a read-cache layer — not before.
- **Best-effort/non-blocking rule:** `notify()` must never propagate errors to callers. Payment transactions especially: a failed notification write after a successful payment should not cause a rollback.
- **Broadcast fan-out concern:** At 10k+ users, `INSERT … SELECT` is a large write. Escape hatch: a `broadcasts(id, message, created_at)` table + `broadcast_dismissals(user_id, broadcast_id)` for per-user dismissal. No fan-out row materialization. Switch when `INSERT … SELECT` blocks for >100 ms in staging.
- **Retention:** Prune with `DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '90 days'`. Not needed at MVP scale.

---

## Verification Steps

1. `pnpm exec tsc --noEmit` in `packages/shared` — clean ✅
2. `pnpm exec tsc --noEmit` in `packages/api` — clean ✅
3. `GET /api/notifications` (authenticated) → `{ data: [], hasMore: false }`
4. `GET /api/notifications/badge` → `{ data: { count: 0 } }`
5. `POST /api/admin/broadcast` with `{ message: "test" }` → rows in notifications table
6. `GET /api/notifications/badge` → `{ data: { count: N } }`
7. `PATCH /api/me` with `{ markNotificationsRead: true }` → badge returns 0
8. `GET /api/notifications?before=<past ISO>` → only rows older than cursor
9. `POST /api/admin/broadcast` with `{}` → 400 with Zod error message
10. `POST /api/admin/broadcast` with `{ message: "" }` → 400
