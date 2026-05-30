-- Migration: service_types single source of truth
-- Run this once against an existing production database that was
-- created before Sprint B1 (schema.ts had specialty TEXT and service TEXT).
-- Safe to re-run; all statements are idempotent.

BEGIN;

-- 1. Add service_type_id FK columns to existing tables (no-op if already present)
ALTER TABLE workers      ADD COLUMN IF NOT EXISTS service_type_id INTEGER REFERENCES service_types(id);
ALTER TABLE orders       ADD COLUMN IF NOT EXISTS service_type_id INTEGER REFERENCES service_types(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS service_type_id INTEGER REFERENCES service_types(id);

-- 2. Backfill from legacy text columns where FK is still NULL
UPDATE workers w
   SET service_type_id = st.id
  FROM service_types st
 WHERE w.specialty = st.name_mn
   AND w.service_type_id IS NULL;

UPDATE orders o
   SET service_type_id = st.id
  FROM service_types st
 WHERE o.service = st.name_mn
   AND o.service_type_id IS NULL;

UPDATE transactions t
   SET service_type_id = st.id
  FROM service_types st
 WHERE t.service = st.name_mn
   AND t.service_type_id IS NULL;

COMMIT;
