-- 1. AI Extractions Table
-- Stores the raw history of AI processing for audit and improvement
CREATE TABLE ai_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  org_id UUID REFERENCES organizations(id),
  raw_text TEXT NOT NULL,
  extraction_result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Order Submissions Table
-- Stores the structured draft orders created by agents
CREATE TABLE order_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  org_id UUID REFERENCES organizations(id),
  customer_name TEXT,
  phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'pending', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE ai_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_submissions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can view extractions in their org"
  ON ai_extractions FOR SELECT
  USING (org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage order submissions in their org"
  ON order_submissions FOR ALL
  USING (org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid()))
  WITH CHECK (org_id IN (SELECT org_id FROM user_roles WHERE user_id = auth.uid()));

-- Note: Logic in audit.ts already handles logging to activity_logs

-- Trigger to automatically populate org_id from user_roles
CREATE OR REPLACE FUNCTION public.set_order_submission_org_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    SELECT org_id INTO NEW.org_id
    FROM public.user_roles
    WHERE user_id = NEW.user_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_set_order_submission_org_id
  BEFORE INSERT ON order_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_submission_org_id();

-- Trigger to automatically populate org_id from user_roles for ai_extractions
CREATE OR REPLACE FUNCTION public.set_ai_extraction_org_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    SELECT org_id INTO NEW.org_id
    FROM public.user_roles
    WHERE user_id = NEW.user_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_set_ai_extraction_org_id
  BEFORE INSERT ON ai_extractions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ai_extraction_org_id();

-- Trigger to automatically populate org_id from user_roles for activity_logs
CREATE OR REPLACE FUNCTION public.set_activity_log_org_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    SELECT org_id INTO NEW.org_id
    FROM public.user_roles
    WHERE user_id = NEW.user_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_set_activity_log_org_id
  BEFORE INSERT ON activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_activity_log_org_id();