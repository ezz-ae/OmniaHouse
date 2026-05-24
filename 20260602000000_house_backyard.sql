-- 1. Enhance Team Profiles with Gaming Mechanics
ALTER TABLE team_profiles 
ADD COLUMN experience_points INTEGER DEFAULT 0,
ADD COLUMN level INTEGER DEFAULT 1,
ADD COLUMN current_streak INTEGER DEFAULT 0,
ADD COLUMN total_points_earned INTEGER DEFAULT 0;

-- 2. Performance Perks (Coupons & Surprise Gifts)
CREATE TABLE backyard_perks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL, -- 'coupon', 'gift_card', 'bonus'
  title TEXT NOT NULL,
  code TEXT, -- Discount code or voucher string
  is_redeemed BOOLEAN DEFAULT false,
  value_aed DECIMAL(12,2) DEFAULT 0, -- Monetary value for finance tracking
  reason TEXT, -- "Surprising Performance for June"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Career Path & Required Learning
CREATE TABLE backyard_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  module_name TEXT NOT NULL,
  status TEXT DEFAULT 'assigned', -- 'assigned', 'in_progress', 'completed'
  is_required BOOLEAN DEFAULT true,
  xp_reward INTEGER DEFAULT 100,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Food Order Bridge (+1 Culture)
CREATE TABLE backyard_food_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  order_details TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'ordered', 'arrived'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Overtime Awareness
CREATE TABLE backyard_wellbeing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  date DATE DEFAULT CURRENT_DATE,
  overtime_minutes INTEGER DEFAULT 0,
  mood_check INTEGER, -- 1-5
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add Backyard Room to Seed
INSERT INTO rooms (name, slug, icon, sort_order) 
VALUES ('House Backyard', 'backyard', 'Beer', 11)
ON CONFLICT (slug) DO NOTHING;

-- Trigger to notify finance on redemption (Transaction Trigger)
CREATE OR REPLACE FUNCTION public.process_perk_redemption_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_redeemed = true AND OLD.is_redeemed = false THEN
    -- Log as a financial event for the Finance team to track
    INSERT INTO public.activity_logs (user_id, org_id, action, metadata)
    VALUES (NEW.user_id, NEW.org_id, 'perk_redemption_transaction', 
      jsonb_build_object('perk_id', NEW.id, 'title', NEW.title, 'value', NEW.value_aed, 'code', NEW.code));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_process_perk_redemption_transaction
  AFTER UPDATE ON backyard_perks
  FOR EACH ROW
  EXECUTE FUNCTION public.process_perk_redemption_transaction();