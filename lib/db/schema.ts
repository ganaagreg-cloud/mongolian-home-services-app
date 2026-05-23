// Each entry is a standalone DDL statement executed once on DB init.
// Order matters — referenced tables must come before referencing tables.
export const TABLES: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    phone        TEXT UNIQUE NOT NULL,
    name         TEXT NOT NULL DEFAULT '',
    role         TEXT NOT NULL DEFAULT 'user',
    dan_verified INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS workers (
    id             TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL REFERENCES users(id),
    specialty      TEXT NOT NULL DEFAULT '',
    price_per_hour INTEGER NOT NULL DEFAULT 0,
    rating         REAL NOT NULL DEFAULT 0,
    review_count   INTEGER NOT NULL DEFAULT 0,
    imei           TEXT,
    police_file    TEXT,
    is_available   INTEGER NOT NULL DEFAULT 1,
    is_active      INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS banking_info (
    id                  TEXT PRIMARY KEY,
    worker_id           TEXT NOT NULL UNIQUE REFERENCES workers(id),
    bank_name           TEXT NOT NULL,
    account_number      TEXT NOT NULL,
    account_holder_name TEXT NOT NULL,
    iban                TEXT NOT NULL,
    account_type        TEXT NOT NULL DEFAULT 'checking',
    verified            INTEGER NOT NULL DEFAULT 0,
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS orders (
    id             TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL REFERENCES users(id),
    worker_id      TEXT NOT NULL REFERENCES workers(id),
    service        TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'pending',
    address        TEXT NOT NULL,
    scheduled_date TEXT NOT NULL,
    hours          INTEGER NOT NULL DEFAULT 1,
    total_amount   INTEGER NOT NULL DEFAULT 0,
    property_type  TEXT,
    notes          TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS messages (
    id         TEXT PRIMARY KEY,
    order_id   TEXT NOT NULL REFERENCES orders(id),
    sender_id  TEXT NOT NULL REFERENCES users(id),
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS reviews (
    id         TEXT PRIMARY KEY,
    order_id   TEXT NOT NULL UNIQUE REFERENCES orders(id),
    worker_id  TEXT NOT NULL REFERENCES workers(id),
    rating     INTEGER NOT NULL,
    comment    TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS transactions (
    id         TEXT PRIMARY KEY,
    worker_id  TEXT NOT NULL REFERENCES workers(id),
    amount     INTEGER NOT NULL,
    type       TEXT NOT NULL,
    service    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS disputes (
    id                  TEXT PRIMARY KEY,
    order_id            TEXT NOT NULL REFERENCES orders(id),
    issue               TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'open',
    compensation_amount INTEGER,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS saved_workers (
    user_id    TEXT NOT NULL REFERENCES users(id),
    worker_id  TEXT NOT NULL REFERENCES workers(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, worker_id)
  )`,

  // OTP codes — short-lived, no foreign key needed
  `CREATE TABLE IF NOT EXISTS otp_codes (
    phone      TEXT NOT NULL,
    code       TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    PRIMARY KEY (phone)
  )`,
]
