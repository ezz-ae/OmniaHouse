-- Add flag to products to identify Limited Edition items
ALTER TABLE products ADD COLUMN is_limited_edition BOOLEAN DEFAULT false;