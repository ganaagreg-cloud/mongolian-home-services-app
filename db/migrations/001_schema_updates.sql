-- Allow refund transaction rows where no worker is yet assigned (e.g. pre-match cancellations)
ALTER TABLE transactions ALTER COLUMN worker_id DROP NOT NULL;

-- Store user avatar URL for profile editing
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';

-- Store photo evidence URLs on dispute records
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}';
