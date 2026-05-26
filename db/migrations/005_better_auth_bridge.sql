-- Phase 2: link our users table to Better Auth's user table (string IDs)
ALTER TABLE users ADD COLUMN IF NOT EXISTS better_auth_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_better_auth_id
  ON users(better_auth_id) WHERE better_auth_id IS NOT NULL;
