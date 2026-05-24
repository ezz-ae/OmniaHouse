-- Function to notify AI when high-value products have high bounce rates
CREATE OR REPLACE FUNCTION public.notify_omnia_ai_on_bounce()
RETURNS TRIGGER AS $$
DECLARE
  v_sku TEXT;
  v_price DECIMAL;
  v_bounce_count INTEGER;
BEGIN
  v_sku := NEW.metadata->>'sku';
  
  -- Monitor 'bounce' events on products
  IF v_sku IS NOT NULL AND NEW.event_name = 'bounce' THEN
    -- Check product value
    SELECT price_aed INTO v_price FROM public.products WHERE sku = v_sku LIMIT 1;
    
    IF v_price >= 3000 THEN
      -- Count bounces in the last 24 hours for this SKU
      SELECT count(*) INTO v_bounce_count 
      FROM public.ga_events 
      WHERE event_name = 'bounce' 
        AND metadata->>'sku' = v_sku 
        AND created_at > NOW() - INTERVAL '24 hours';
        
      -- If threshold (10 bounces) is met, notify the Intelligence layer
      IF v_bounce_count >= 10 THEN
        INSERT INTO public.user_intelligence (
          org_id,
          decision_type,
          risk_score,
          reasoning,
          actionable_insight
        ) VALUES (
          NEW.org_id,
          'high_bounce_alert',
          85,
          'SKU ' || v_sku || ' is high-value (' || v_price || ' AED) but has 10+ bounces in 24h.',
          'Action: OPTIMIZE_CONTENT for SKU ' || v_sku
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_notify_omnia_ai_on_bounce
  AFTER INSERT ON public.ga_events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_omnia_ai_on_bounce();