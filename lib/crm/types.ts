/**
 * CRM types — mirror the SQL:
 *   crm_identity_links  (20260608)
 *   crm_shortcuts       (20260608)
 *   order_submissions  (labels, is_archived, assigned_agent_id additions)
 *
 * Ghost linking — when a customer's phone number is known, we link it
 * to every prior anonymous GA session id from cookies. This is how
 * "ghost browse" history shows up in the WhatsApp Desk before they
 * identify themselves.
 */

export type CRMIdentityLink = {
  id: string;
  org_id: string;
  customer_phone: string;        // normalized E.164
  session_id: string;            // GA session id
  first_seen: string;
  last_active: string;
};

export type CRMShortcutCategory =
  | 'welcome'
  | 'pricing'
  | 'shipping'
  | 'payment'
  | 'follow_up'
  | 'closing'
  | 'objection'
  | 'general';

export type CRMShortcut = {
  id: string;
  org_id: string;
  trigger_key: string;           // e.g., "/welcome"
  content: string;
  category: CRMShortcutCategory;
  created_at: string;
};
