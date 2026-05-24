-- 1. Meta Posts Table (Organic & Scheduled)
CREATE TABLE meta_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'instagram', 'facebook'
  post_type TEXT NOT NULL, -- 'reel', 'image', 'carousel'
  content_text TEXT,
  media_urls TEXT[],
  performance_metrics JSONB DEFAULT '{}'::jsonb, -- likes, shares, saves
  scheduled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'published'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Meta Ads Monitoring
CREATE TABLE meta_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ad_id TEXT UNIQUE NOT NULL,
  campaign_name TEXT,
  spend_aed DECIMAL(12,2),
  roas DECIMAL(5,2),
  sentiment_score INTEGER, -- 1-100 derived from comments
  is_monitored BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Brand Security Alerts (Attack Detection)
CREATE TABLE meta_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'negative_surge', 'low_roas', 'ad_violation'
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);