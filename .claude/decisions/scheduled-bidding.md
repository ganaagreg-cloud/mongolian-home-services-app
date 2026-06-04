# Scheduled Bidding — Decision Record

## Problem

Instant orders use a pay-first, system-matched flow that works for same-day
cleaning. Scheduled orders (future dates) need a different model: customers
want to compare workers and choose, workers need to signal interest without
being locked in, and calendar conflicts must be enforced at the DB level not
in application code.

## Decision: Bid Model

Customer posts a scheduled job → workers apply (unlimited, non-binding) →
customer picks one → customer pays to confirm → escrow funded → job booked.

**Instant booking is unchanged**: pay-first → system matches → `matched` status
immediately. No bids, no applications table, no worker_schedule row involved.

---

## Applications

- Table: `applications` (worker_id, order_id, status, created_at, updated_at)
- A worker may apply to the same order only once (UNIQUE worker_id + order_id).
- Status lifecycle: `pending` → `withdrawn` (worker pulls out) or `selected`
  (customer picks this worker).
- Applying **never** writes to `worker_schedule`. The calendar is not touched
  until payment is confirmed (order reaches `matched`).
- No cap on how many workers can apply to one order.
- After a worker is `selected`, the other applications remain `pending` until
  payment confirmation; they are bulk-updated to `withdrawn` at that point.

## Calendar Conflict Resolution

Conflicts are resolved at the moment of booking (payment confirmation), not at
application time, via a PostgreSQL exclusion constraint.

### worker_schedule table

```sql
CREATE TABLE worker_schedule (
  id          SERIAL PRIMARY KEY,
  worker_id   INTEGER NOT NULL REFERENCES workers(id),
  order_id    INTEGER NOT NULL REFERENCES orders(id),
  time_range  TSTZRANGE NOT NULL,          -- [start, end + 60 min)
  status      TEXT NOT NULL DEFAULT 'pending_payment'
              CHECK (status IN ('pending_payment', 'booked')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  EXCLUDE USING gist (worker_id WITH =, time_range WITH &&)
)
```

- Requires `CREATE EXTENSION IF NOT EXISTS btree_gist` (enables integer
  columns inside GIST indexes).
- `time_range = [scheduled_start, scheduled_end + INTERVAL '60 minutes')`.
  Half-open `[)` semantics mean jobs ending exactly 60 min before the next
  start are **allowed** (no false conflicts for back-to-back jobs).
- A row is inserted with `status = 'pending_payment'` when the customer selects
  a worker (before payment). This blocks any concurrent booking attempt on the
  same slot. If payment times out or fails, the row is deleted.
- On payment confirmation the row is updated to `status = 'booked'`.
- The exclusion constraint fires on INSERT for both `pending_payment` and
  `booked` rows — so a pending payment blocks others, as intended.

### Slot Size

`time_range` width = `orders.hours` (job duration) + flat 60-minute transport
buffer appended to the **end**. Start time is `orders.scheduled_date`.

Real travel-time routing (Google Maps / HERE) is **deferred to Phase 2**.

## Scheduled Order State Machine

```
pending_acceptance
  │  customer posts job (no escrow yet)
  ▼
awaiting_payment
  │  customer selects a worker; worker_schedule row inserted (pending_payment);
  │  payment_deadline set (e.g. NOW() + 30 min)
  ▼
matched
     payment confirmed; escrow funded; worker_schedule status → booked;
     other applications bulk-withdrawn
```

New field on `orders`: `payment_deadline TIMESTAMPTZ` (NULL for instant orders
and for `pending_acceptance` scheduled orders; set when status → `awaiting_payment`).

The existing `orders.status` values (`searching_worker`, `worker_matched`,
`in_progress`, `completed`, `cancelled`, `disputed`) continue to be used for
the post-booking lifecycle.

## Worker Calendar View (MVP)

The MVP schedule view is a **calendar grid** showing the worker's booked and
pending-payment slots. No map, no route optimization. Workers see their
occupied `time_range` blocks; gaps between blocks are open for new applications.

Route optimization and travel-time estimation are Phase 2 scope.

## Money

All amounts are `INTEGER` MNT — no floats, no decimals. Unchanged from the
rest of the platform.

## What Is Not Changed

- Instant orders: `matching_strategy = 'instant'` path is untouched. No
  `applications` row, no `worker_schedule` row, no bid lifecycle.
- `payment_intents` table: unchanged; used for both instant and scheduled
  payment confirmation (the existing `paid_at` column is sufficient).
- Worker `is_active` / `is_available` requirements: unchanged. Workers must
  have both flags true to appear in search results regardless of flow.

## Phase 2 Deferred Items

- Real travel-time routing for buffer calculation
- `authorized_at` + `authorized_amount` for inspection/survey pricing
- Delta re-authorization on QPay V2
