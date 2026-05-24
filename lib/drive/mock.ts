import type { DriveFile, RoomWorkflow } from './types';

/**
 * Drive Room mock data — files in The Safe + pending Corridors.
 *
 * Realistic enough that the room feels alive without Supabase. When the
 * real backend is wired, these arrays are replaced by SELECTs against
 * drive_files and room_workflows respectively.
 */

const NOW = '2026-05-24';

export const MOCK_FILES: DriveFile[] = [
  {
    id: 'df_1',
    org_id: 'o_omnia',
    user_id: 'u_ahmed',
    drive_id: 'drv_eid_brief',
    name: 'Eid 2026 — Creative Brief.docx',
    mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size_bytes: 84_320,
    visibility: 'all',
    target_role_id: null,
    metadata: {
      suggested_corridor: 'marketing',
      extraction_status: 'processed',
      extracted_summary: 'Eid creative brief — two reels + email sequence + landing page. Launch 2026-05-30.',
      last_scanned_at: `${NOW} 17:15`,
    },
    created_at: `${NOW} 17:15`,
  },
  {
    id: 'df_2',
    org_id: 'o_omnia',
    user_id: 'u_ez',
    drive_id: 'drv_supplier_may',
    name: 'Supplier Invoice — May 2026.pdf',
    mime_type: 'application/pdf',
    size_bytes: 240_000,
    visibility: 'role',
    target_role_id: 'role_finance',
    metadata: {
      suggested_corridor: 'inventory',
      extraction_status: 'pending',
      last_scanned_at: `${NOW} 10:02`,
    },
    created_at: `${NOW} 10:02`,
  },
  {
    id: 'df_3',
    org_id: 'o_omnia',
    user_id: 'u_ahmed',
    drive_id: 'drv_le_shoot',
    name: 'LE Celestial — Final Shoot.zip',
    mime_type: 'application/zip',
    size_bytes: 142_000_000,
    visibility: 'role',
    target_role_id: 'role_marketing',
    metadata: {
      suggested_corridor: 'marketing',
      extraction_status: 'processed',
      extracted_summary: '48 hi-res images + 6 BTS clips. Pinned for the Eid landing page.',
      last_scanned_at: '2026-05-22 19:00',
    },
    created_at: '2026-05-22 19:00',
  },
  {
    id: 'df_4',
    org_id: 'o_omnia',
    user_id: 'u_ez',
    drive_id: 'drv_bnpl_cost',
    name: 'Tamara vs Tabby — Cost Sheet.xlsx',
    mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size_bytes: 38_000,
    visibility: 'all',
    target_role_id: null,
    metadata: {
      suggested_corridor: 'finance',
      extraction_status: 'processed',
      extracted_summary: 'Tamara 15% + 30d. Tabby 12% + 14d. Pending BNPL decision.',
      last_scanned_at: '2026-05-20 16:30',
    },
    created_at: '2026-05-20 16:30',
  },
  {
    id: 'df_5',
    org_id: 'o_omnia',
    user_id: 'u_abdelrahman',
    drive_id: 'drv_wa_scripts',
    name: 'WhatsApp Scripts — Arabic v3.md',
    mime_type: 'text/markdown',
    size_bytes: 12_400,
    visibility: 'role',
    target_role_id: 'role_whatsapp_agent',
    metadata: {
      suggested_corridor: 'none',
      extraction_status: 'processed',
      extracted_summary: 'Updated bridal-flow phrasing. Pinned in WhatsApp Desk shortcuts.',
      last_scanned_at: '2026-05-18 11:00',
    },
    created_at: '2026-05-18 11:00',
  },
  {
    id: 'df_6',
    org_id: 'o_omnia',
    user_id: 'u_ez',
    drive_id: 'drv_ksa_report',
    name: 'KSA Buyers — Q1 Behavior Report.pdf',
    mime_type: 'application/pdf',
    size_bytes: 1_240_000,
    visibility: 'all',
    target_role_id: null,
    metadata: {
      suggested_corridor: 'marketing',
      extraction_status: 'processed',
      extracted_summary: '78% of KSA buyers convert within 24h of a WhatsApp price. Confirmed by Shopify funnel.',
      last_scanned_at: '2026-05-15 09:00',
    },
    created_at: '2026-05-15 09:00',
  },
  {
    id: 'df_7',
    org_id: 'o_omnia',
    user_id: 'u_ahmed',
    drive_id: 'drv_meta_settlement',
    name: 'Meta Settlement — May Week 3.csv',
    mime_type: 'text/csv',
    size_bytes: 18_900,
    visibility: 'role',
    target_role_id: 'role_finance',
    metadata: {
      suggested_corridor: 'finance',
      extraction_status: 'pending',
      last_scanned_at: `${NOW} 08:45`,
    },
    created_at: `${NOW} 08:45`,
  },
];

export const MOCK_WORKFLOWS: RoomWorkflow[] = [
  {
    id: 'wf_1',
    org_id: 'o_omnia',
    source_room_slug: 'drive-room',
    target_room_slug: 'inventory',
    trigger_action: 'invoice_extracted',
    payload: {
      drive_id: 'drv_supplier_may',
      items: [
        { sku: 'OM-RING-CR-925', title: 'Crescent Ring 925', cost_price: 510 },
        { sku: 'OM-PEND-MS-925', title: 'Moonstone Pendant', cost_price: 360 },
      ],
      summary: 'Supplier invoice. OM-RING-CR-925 cost up from 480 → 510. Decide on volume commitment.',
    },
    status: 'pending',
    created_at: `${NOW} 10:05`,
  },
  {
    id: 'wf_2',
    org_id: 'o_omnia',
    source_room_slug: 'drive-room',
    target_room_slug: 'finance',
    trigger_action: 'file_uploaded',
    payload: {
      drive_id: 'drv_meta_settlement',
      summary: 'Meta settlement file. Routes to Finance for reconciliation.',
    },
    status: 'pending',
    created_at: `${NOW} 08:46`,
  },
  {
    id: 'wf_3',
    org_id: 'o_omnia',
    source_room_slug: 'drive-room',
    target_room_slug: 'marketing',
    trigger_action: 'creative_brief_ready',
    payload: {
      drive_id: 'drv_eid_brief',
      summary: 'Eid 2026 creative brief ready. Awaiting sign-off before paid spend.',
    },
    status: 'processed',
    created_at: '2026-05-23 17:20',
  },
];

export function getDriveFiles(): DriveFile[] {
  return MOCK_FILES;
}

export function getRoomWorkflows(): RoomWorkflow[] {
  return MOCK_WORKFLOWS.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getPendingWorkflows(): RoomWorkflow[] {
  return MOCK_WORKFLOWS.filter((w) => w.status === 'pending');
}

export function getDriveFile(id: string): DriveFile | undefined {
  return MOCK_FILES.find((f) => f.id === id);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Human-readable corridor label. */
export function corridorLabel(slug: string): string {
  const labels: Record<string, string> = {
    inventory: 'Inventory',
    finance: 'Finance',
    marketing: 'Brand Intelligence',
    'whatsapp-desk': 'WhatsApp Desk',
    'brand-intelligence': 'Brand Intelligence',
    orders: 'Orders',
    cashback: 'Cashback',
    'omnia-ai': 'Omnia AI',
    none: 'No corridor',
  };
  return labels[slug] || slug;
}

/** Bytes → human-readable. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** Group files by visibility level. */
export function groupByVisibility(files: DriveFile[]) {
  return {
    all: files.filter((f) => f.visibility === 'all'),
    role: files.filter((f) => f.visibility === 'role'),
    private: files.filter((f) => f.visibility === 'private'),
  };
}
