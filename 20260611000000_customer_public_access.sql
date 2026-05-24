-- Add a public slug for anonymous access links
ALTER TABLE customer_wallets ADD COLUMN public_slug TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex');

-- Ensure existing wallets get a slug
UPDATE customer_wallets 
SET public_slug = encode(gen_random_bytes(6), 'hex') 
WHERE public_slug IS NULL;