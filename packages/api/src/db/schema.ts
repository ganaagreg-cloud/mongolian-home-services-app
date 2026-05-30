// PostgreSQL DDL — executed once on DB init via lib/db/index.ts
// Order matters: referenced tables must be created before referencing tables.
export const TABLES: string[] = [
  // ── Better Auth tables (camelCase columns — do not rename) ──────────────────
  `CREATE TABLE IF NOT EXISTS "user" (
    id              TEXT NOT NULL PRIMARY KEY,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    image           TEXT,
    "createdAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
    is_worker       BOOLEAN NOT NULL DEFAULT false,
    active_mode     TEXT NOT NULL DEFAULT 'user',
    phone           TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS session (
    id          TEXT NOT NULL PRIMARY KEY,
    "expiresAt" TIMESTAMP NOT NULL,
    token       TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId"    TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS account (
    id                       TEXT NOT NULL PRIMARY KEY,
    "accountId"              TEXT NOT NULL,
    "providerId"             TEXT NOT NULL,
    "userId"                 TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "accessToken"            TEXT,
    "refreshToken"           TEXT,
    "idToken"                TEXT,
    "accessTokenExpiresAt"   TIMESTAMP,
    "refreshTokenExpiresAt"  TIMESTAMP,
    scope                    TEXT,
    password                 TEXT,
    "createdAt"              TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt"              TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS verification (
    id          TEXT NOT NULL PRIMARY KEY,
    identifier  TEXT NOT NULL,
    value       TEXT NOT NULL,
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
  )`,
  // ── App tables ──────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS service_types (
    id         SERIAL PRIMARY KEY,
    name_mn    TEXT NOT NULL UNIQUE,
    icon       TEXT NOT NULL DEFAULT 'sparkles',
    is_active  BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS users (
    id               SERIAL PRIMARY KEY,
    phone            VARCHAR(20) UNIQUE NOT NULL,
    name             TEXT NOT NULL DEFAULT '',
    username         TEXT NOT NULL DEFAULT '',
    password_hash    TEXT NOT NULL DEFAULT '',
    first_name       TEXT NOT NULL DEFAULT '',
    last_name        TEXT NOT NULL DEFAULT '',
    firstname        VARCHAR(100) NOT NULL DEFAULT '',
    lastname         VARCHAR(100) NOT NULL DEFAULT '',
    registernumber   VARCHAR(20) NOT NULL DEFAULT '',
    email            TEXT NOT NULL DEFAULT '',
    role             VARCHAR(20) NOT NULL DEFAULT 'user',
    dan_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
    is_worker        BOOLEAN NOT NULL DEFAULT FALSE,
    active_mode      TEXT NOT NULL DEFAULT 'user' CHECK (active_mode IN ('user', 'worker')),
    google_id        TEXT,
    facebook_id      TEXT,
    better_auth_id   TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
    ON users(username) WHERE username != ''`,

  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
    ON users(email) WHERE email != ''`,

  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_registernumber
    ON users(registernumber) WHERE registernumber != ''`,

  `CREATE TABLE IF NOT EXISTS workers (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    service_type_id INTEGER REFERENCES service_types(id),
    price_per_hour  INTEGER NOT NULL DEFAULT 0,
    rating          DOUBLE PRECISION NOT NULL DEFAULT 0,
    review_count    INTEGER NOT NULL DEFAULT 0,
    imei            TEXT,
    police_file     TEXT,
    is_available    BOOLEAN NOT NULL DEFAULT TRUE,
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS banking_info (
    id                  SERIAL PRIMARY KEY,
    worker_id           INTEGER NOT NULL UNIQUE REFERENCES workers(id),
    bank_name           TEXT NOT NULL,
    account_number      TEXT NOT NULL,
    account_holder_name TEXT NOT NULL,
    iban                TEXT NOT NULL,
    account_type        TEXT NOT NULL DEFAULT 'checking',
    verified            BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS orders (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id),
    worker_id           INTEGER REFERENCES workers(id),
    service_type_id     INTEGER REFERENCES service_types(id),
    status              VARCHAR(40) NOT NULL DEFAULT 'searching_worker',
    address             TEXT NOT NULL,
    scheduled_date      TIMESTAMPTZ NOT NULL,
    hours               INTEGER NOT NULL DEFAULT 1,
    total_amount        INTEGER NOT NULL DEFAULT 0,
    urgent              BOOLEAN NOT NULL DEFAULT FALSE,
    rooms               INTEGER,
    area_sqm            INTEGER,
    property_type       TEXT,
    notes               TEXT,
    matching_strategy   VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    payment_status      VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    payment_gateway     VARCHAR(20) NOT NULL DEFAULT 'qpay',
    gateway_invoice_id  VARCHAR(100),
    before_photo_url    TEXT,
    after_photo_url     TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS messages (
    id         SERIAL PRIMARY KEY,
    order_id   INTEGER NOT NULL REFERENCES orders(id),
    sender_id  INTEGER NOT NULL REFERENCES users(id),
    text       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS reviews (
    id         SERIAL PRIMARY KEY,
    order_id   INTEGER NOT NULL UNIQUE REFERENCES orders(id),
    worker_id  INTEGER NOT NULL REFERENCES workers(id),
    rating     INTEGER NOT NULL,
    comment    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS transactions (
    id              SERIAL PRIMARY KEY,
    worker_id       INTEGER NOT NULL REFERENCES workers(id),
    amount          INTEGER NOT NULL,
    type            TEXT NOT NULL,
    service_type_id INTEGER REFERENCES service_types(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS disputes (
    id                  SERIAL PRIMARY KEY,
    order_id            INTEGER NOT NULL REFERENCES orders(id),
    issue               TEXT NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'open',
    compensation_amount INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS saved_workers (
    user_id    INTEGER NOT NULL REFERENCES users(id),
    worker_id  INTEGER NOT NULL REFERENCES workers(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, worker_id)
  )`,

  `CREATE TABLE IF NOT EXISTS otp_codes (
    phone      VARCHAR(20) NOT NULL PRIMARY KEY,
    code       TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS order_match_attempts (
    id           SERIAL PRIMARY KEY,
    order_id     INTEGER NOT NULL REFERENCES orders(id),
    worker_id    INTEGER NOT NULL REFERENCES workers(id),
    status       VARCHAR(20) NOT NULL DEFAULT 'offered',
    offered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ
  )`,

  `CREATE TABLE IF NOT EXISTS order_acceptances (
    id         SERIAL PRIMARY KEY,
    order_id   INTEGER NOT NULL REFERENCES orders(id),
    worker_id  INTEGER NOT NULL REFERENCES workers(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    picked_at  TIMESTAMPTZ,
    UNIQUE (order_id, worker_id)
  )`,

  `CREATE TABLE IF NOT EXISTS sos_alerts (
    id               SERIAL PRIMARY KEY,
    order_id         INTEGER REFERENCES orders(id),
    triggered_by_id  INTEGER NOT NULL REFERENCES users(id),
    role             VARCHAR(20) NOT NULL,
    latitude         DOUBLE PRECISION,
    longitude        DOUBLE PRECISION,
    status           VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Idempotent column and constraint migrations — safe to re-run on every boot
  `ALTER TABLE transactions ALTER COLUMN worker_id DROP NOT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url    TEXT    NOT NULL DEFAULT ''`,
  `ALTER TABLE disputes ADD COLUMN IF NOT EXISTS photo_urls TEXT[]  NOT NULL DEFAULT '{}'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_worker     BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS active_mode   TEXT    NOT NULL DEFAULT 'user'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id     TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id   TEXT`,
  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'users_active_mode_check'
    ) THEN
      ALTER TABLE users ADD CONSTRAINT users_active_mode_check
        CHECK (active_mode IN ('user', 'worker'));
    END IF;
  END $$`,
  // OAuth users have no phone — make the column nullable so BA hook inserts work
  `ALTER TABLE users ALTER COLUMN phone DROP NOT NULL`,
  // Seed workers predate is_worker column; backfill so routing works
  `UPDATE users SET is_worker = true WHERE role = 'worker' AND is_worker = false`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id      ON users(google_id)      WHERE google_id      IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_facebook_id    ON users(facebook_id)    WHERE facebook_id    IS NOT NULL`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS better_auth_id  TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_better_auth_id ON users(better_auth_id) WHERE better_auth_id IS NOT NULL`,
  // Normalize: workers are now users with is_worker=true; role column only tracks 'user' | 'admin'
  `UPDATE users SET role = 'user' WHERE role = 'worker'`,
  // BA "user" table: add DEFAULT values for extra columns added after initial creation
  `ALTER TABLE "user" ALTER COLUMN is_worker  SET DEFAULT false`,
  `ALTER TABLE "user" ALTER COLUMN active_mode SET DEFAULT 'user'`,
  `UPDATE "user" SET is_worker = false  WHERE is_worker  IS NULL`,
  `UPDATE "user" SET active_mode = 'user' WHERE active_mode IS NULL`,
  // Worker profile fields
  `ALTER TABLE workers ADD COLUMN IF NOT EXISTS specialty      TEXT    NOT NULL DEFAULT ''`,
  `ALTER TABLE workers ADD COLUMN IF NOT EXISTS price_per_hour INTEGER NOT NULL DEFAULT 0`,
  // Admin reject soft state
  `ALTER TABLE workers ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ`,
  // Soft delete for users (admin suspend)
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
  // FK migrations: add service_type_id to existing tables
  `ALTER TABLE workers ADD COLUMN IF NOT EXISTS service_type_id INTEGER REFERENCES service_types(id)`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_type_id INTEGER REFERENCES service_types(id)`,
  `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS service_type_id INTEGER REFERENCES service_types(id)`,
  // Legacy service TEXT column — set default so INSERTs that omit it don't fail
  `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='service') THEN
      ALTER TABLE orders ALTER COLUMN service SET DEFAULT '';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='service') THEN
      ALTER TABLE transactions ALTER COLUMN service SET DEFAULT '';
    END IF;
  END $$`,
  // Master data tables
  `CREATE TABLE IF NOT EXISTS districts (
    id         SERIAL PRIMARY KEY,
    name_mn    TEXT NOT NULL,
    is_active  BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS pricing_rules (
    id                  SERIAL PRIMARY KEY,
    service_type_id     INTEGER REFERENCES service_types(id),
    base_rate           INTEGER NOT NULL DEFAULT 15000,
    peak_multiplier     INTEGER NOT NULL DEFAULT 20,
    holiday_multiplier  INTEGER NOT NULL DEFAULT 30,
    updated_at          TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `INSERT INTO app_settings (key, value) VALUES
    ('platform_commission',   '15'),
    ('damage_fund_rate',      '2'),
    ('free_cancel_minutes',   '60'),
    ('late_cancel_fee',       '5000'),
    ('urgent_fee_multiplier', '0')
   ON CONFLICT (key) DO NOTHING`,
]
