-- Add metadata column to store Neural Snapshots and other behavioral flags
ALTER TABLE customer_wallets ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;