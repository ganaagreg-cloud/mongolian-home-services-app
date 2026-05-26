-- Phase 1: Unified role model — users can be both a user and a worker
-- is_worker is set to true only when admin approves a worker application
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_worker     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_mode   TEXT    NOT NULL DEFAULT 'user'
  CHECK (active_mode IN ('user', 'worker'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id     TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id   TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id
  ON users(google_id) WHERE google_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_facebook_id
  ON users(facebook_id) WHERE facebook_id IS NOT NULL;
