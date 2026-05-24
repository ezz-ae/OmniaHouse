/**
 * Drive Room types — mirror the SQL:
 *   drive_files      (20260527)
 *   room_workflows   (20260527)
 *
 * Plus the agent-output shapes from:
 *   DRIVE_INTELLIGENCE_PROMPT
 *   INVOICE_COMPARISON_PROMPT
 */

// ─── drive_files (The Safe) ────────────────────────────────────────────────

export type DriveVisibility = 'all' | 'role' | 'private';

export type DriveFile = {
  id: string;
  org_id: string;
  user_id: string | null;
  drive_id: string;              // external Google Drive ID
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  visibility: DriveVisibility;
  target_role_id: string | null; // null if visibility is 'all'
  metadata: {
    suggested_corridor?: 'inventory' | 'finance' | 'marketing' | 'none';
    extraction_status?: 'pending' | 'processed' | 'failed';
    extracted_summary?: string;
    last_scanned_at?: string;
    [k: string]: any;
  };
  created_at: string;
};

// ─── room_workflows (The Corridors) ────────────────────────────────────────

export type CorridorRoomSlug =
  | 'inventory'
  | 'finance'
  | 'marketing'
  | 'whatsapp-desk'
  | 'brand-intelligence'
  | 'orders'
  | 'cashback'
  | 'omnia-ai';

export type CorridorTriggerAction =
  | 'file_uploaded'
  | 'invoice_extracted'
  | 'price_drift_detected'
  | 'creative_brief_ready'
  | 'campaign_ready'
  | 'sentiment_alert';

export type CorridorStatus = 'pending' | 'processed' | 'failed';

export type RoomWorkflow = {
  id: string;
  org_id: string;
  source_room_slug: CorridorRoomSlug;
  target_room_slug: CorridorRoomSlug;
  trigger_action: CorridorTriggerAction;
  payload: Record<string, any>;
  status: CorridorStatus;
  created_at: string;
};

// ─── DRIVE_INTELLIGENCE_PROMPT output ──────────────────────────────────────

export type DriveIntelligenceResult = {
  suggested_corridor: 'inventory' | 'finance' | 'marketing' | 'none';
  extracted_data: {
    items: { sku: string; title: string; price: number }[];
    summary: string;
  };
  draft_email: {
    subject: string;
    body: string;
    target: 'internal' | 'external';
  };
};

// ─── INVOICE_COMPARISON_PROMPT output ──────────────────────────────────────

export type InvoiceComparisonResult = {
  comparison_summary: string;
  discrepancies: { sku: string; issue: string }[];
  savings_opportunity: string | null;
};
