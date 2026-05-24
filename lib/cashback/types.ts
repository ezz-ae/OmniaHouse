/**
 * Cashback wallet types — mirror the SQL:
 *   customer_wallets               (20260609)
 *     + 20260611: public_slug
 *     + 20260612: metadata
 *     + 20260613: is_blocked, block_reason, blocked_at
 *   customer_wallet_transactions   (20260609)
 *   order_submissions (cashback fields)
 *
 * Wallet balance is restricted to Limited Edition spends. The public_slug
 * gives each customer a /portal/[slug] page to check their balance without
 * needing an account.
 */

export type WalletMetadata = {
  /** Neural snapshot — last AI evaluation of this customer's behaviour. */
  ai_snapshot?: {
    decision: 'monitor' | 'flag_fraud' | 'retarget' | 'ignore';
    risk_score: number;
    at: string;
  };
  /** Tags applied by agents (e.g., "repeat_refund", "vip"). */
  tags?: string[];
  /** Last cross-store sync. */
  last_synced_at?: string;
  [k: string]: any;
};

export type CustomerWallet = {
  id: string;
  org_id: string;
  customer_phone: string;        // normalized E.164
  balance_aed: number;           // restricted to limited_editions
  public_slug: string;           // /portal/[slug]
  metadata: WalletMetadata;
  is_blocked: boolean;
  block_reason: string | null;
  blocked_at: string | null;
  last_transaction_at: string;
  created_at: string;
};

export type WalletTransactionType = 'accrual' | 'spending';

export type CustomerWalletTransaction = {
  id: string;
  org_id: string;
  customer_phone: string;
  amount: number;                // positive = accrual, negative = spending
  type: WalletTransactionType;
  reference_id: string | null;   // order_submission_id
  created_at: string;
};
