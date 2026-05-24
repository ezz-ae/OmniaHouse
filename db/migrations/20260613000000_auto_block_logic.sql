-- Add block status to customer wallets (our primary phone-based identity anchor)
ALTER TABLE customer_wallets 
ADD COLUMN is_blocked BOOLEAN DEFAULT false,
ADD COLUMN block_reason TEXT,
ADD COLUMN blocked_at TIMESTAMPTZ;