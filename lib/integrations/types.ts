/**
 * Org integration types — mirror the SQL:
 *   org_integrations  (20260615)
 *
 * This table holds the credentials and status for every external service
 * the org connects to: storefronts, payment, BNPL. In production, secrets
 * are encrypted or referenced via env vars — never stored plaintext.
 */

export type IntegrationProvider =
  | 'shopify'
  | 'woocommerce'
  | 'telr'
  | 'stripe'
  | 'tabby'
  | 'tamara'
  | 'whatsapp_business'
  | 'meta_ads'
  | 'google_ads'
  | 'google_analytics'
  | 'google_drive';

export type IntegrationStatus = 'active' | 'error' | 'disconnected';

export type IntegrationMetadata = {
  /** Storefront store id (Shopify shop name, etc.). */
  store_id?: string;
  /** Provider's last reported version, used for compat checks. */
  api_version?: string;
  /** Last error if status='error'. */
  last_error?: string;
  /** Webhook subscription state. */
  webhooks?: { topic: string; subscribed_at: string }[];
  [k: string]: any;
};

export type OrgIntegration = {
  id: string;
  org_id: string;
  provider: IntegrationProvider;
  /** Never read this client-side. Server-only. */
  api_key: string | null;
  /** Never read this client-side. Server-only. */
  api_secret: string | null;
  /** Never read this client-side. Server-only. */
  webhook_secret: string | null;
  base_url: string | null;
  status: IntegrationStatus;
  metadata: IntegrationMetadata;
  last_sync_at: string | null;
  created_at: string;
};

/** Safe shape to send to the client — strips secrets. */
export type OrgIntegrationPublic = Omit<OrgIntegration, 'api_key' | 'api_secret' | 'webhook_secret'>;

export function toPublicIntegration(i: OrgIntegration): OrgIntegrationPublic {
  const { api_key: _k, api_secret: _s, webhook_secret: _w, ...rest } = i;
  return rest;
}
