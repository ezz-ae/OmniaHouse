-- migration for cashback and restricted wallet logic

-- 1. Extend Order Submissions to track cashback metrics
ALTER TABLE order_submissions 
ADD COLUMN cashback_earned_aed DECIMAL(12,2) DEFAULT 0,
ADD COLUMN cashback_applied_aed DECIMAL(12,2) DEFAULT 0;

-- 2. Customer Wallets (Neural Credit)
CREATE TABLE customer_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  balance_aed DECIMAL(12,2) DEFAULT 0, -- Balances restricted to Limited Editions
  last_transaction_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, customer_phone)
);

-- 3. Wallet Transactions (The Ledger)
CREATE TABLE customer_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL, -- positive for accrual, negative for spending
  type TEXT NOT NULL, -- 'accrual', 'spending'
  reference_id UUID, -- order_submission_id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Trigger to automate cashback accrual upon payment
CREATE OR REPLACE FUNCTION public.process_cashback_accrual()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' AND NEW.cashback_earned_aed > 0 THEN
    -- Update balance
    INSERT INTO public.customer_wallets (org_id, customer_phone, balance_aed)
    VALUES (NEW.org_id, NEW.phone, NEW.cashback_earned_aed)
    ON CONFLICT (org_id, customer_phone)
    DO UPDATE SET 
      balance_aed = customer_wallets.balance_aed + EXCLUDED.balance_aed,
      last_transaction_at = NOW();

    -- Log Transaction
    INSERT INTO public.customer_wallet_transactions (org_id, customer_phone, amount, type, reference_id)
    VALUES (NEW.org_id, NEW.phone, NEW.cashback_earned_aed, 'accrual', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_process_cashback_accrual
  AFTER UPDATE ON order_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.process_cashback_accrual();

-- 5. Trigger to automate balance deduction when credit is applied
CREATE OR REPLACE FUNCTION public.process_cashback_spending()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cashback_applied_aed > 0 THEN
    -- Update wallet balance (assume validation happened in UI/App layer)
    UPDATE public.customer_wallets
    SET 
      balance_aed = balance_aed - NEW.cashback_applied_aed,
      last_transaction_at = NOW()
    WHERE customer_phone = NEW.phone AND org_id = NEW.org_id;
    
    -- Log Transaction
    INSERT INTO public.customer_wallet_transactions (org_id, customer_phone, amount, type, reference_id)
    VALUES (NEW.org_id, NEW.phone, -NEW.cashback_applied_aed, 'spending', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_process_cashback_spending
  AFTER INSERT ON order_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.process_cashback_spending();