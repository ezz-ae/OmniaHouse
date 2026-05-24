-- 1. Track team member session location and lock status
ALTER TABLE user_roles 
ADD COLUMN last_sign_in_ip TEXT,
ADD COLUMN is_locked BOOLEAN DEFAULT false,
ADD COLUMN lock_reason TEXT;