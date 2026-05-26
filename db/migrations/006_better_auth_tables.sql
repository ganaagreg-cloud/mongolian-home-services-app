-- Better Auth tables (user, session, account, verification)
-- These are managed by Better Auth but need to exist in our DB.
-- NOTE: Better Auth uses camelCase column names in PostgreSQL.

CREATE TABLE IF NOT EXISTS "user" (
  id               TEXT NOT NULL PRIMARY KEY,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  "emailVerified"  BOOLEAN NOT NULL DEFAULT FALSE,
  image            TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_worker        BOOLEAN NOT NULL DEFAULT FALSE,
  active_mode      TEXT NOT NULL DEFAULT 'user',
  phone            TEXT
);

CREATE TABLE IF NOT EXISTS session (
  id           TEXT NOT NULL PRIMARY KEY,
  "expiresAt"  TIMESTAMPTZ NOT NULL,
  token        TEXT NOT NULL UNIQUE,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "userId"     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_token  ON session(token);
CREATE INDEX        IF NOT EXISTS idx_session_userId ON session("userId");

CREATE TABLE IF NOT EXISTS account (
  id                      TEXT NOT NULL PRIMARY KEY,
  "accountId"             TEXT NOT NULL,
  "providerId"            TEXT NOT NULL,
  "userId"                TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken"           TEXT,
  "refreshToken"          TEXT,
  "idToken"               TEXT,
  "accessTokenExpiresAt"  TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  scope                   TEXT,
  password                TEXT,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_account_userId ON account("userId");

CREATE TABLE IF NOT EXISTS verification (
  id          TEXT NOT NULL PRIMARY KEY,
  identifier  TEXT NOT NULL,
  value       TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);
