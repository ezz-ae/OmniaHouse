import { createClient, createServiceClient } from '@/lib/supabase/server';

// ─── Action constants ─────────────────────────────────────────────────────
// Spec ref: docs/specs/2026-05-26-whatsapp-webhook-persistence.md §audit.

export const AUDIT_ACTIONS = {
  // WhatsApp persistence
  WA_MESSAGE_PERSISTED: 'wa.message.persisted',
  WA_STATUS_PERSISTED: 'wa.status.persisted',
} as const;

// ─── User-context audit (existing path) ───────────────────────────────────
// Used by route handlers that have a Supabase session — pulls the user_id
// from the cookie-backed session and writes to activity_logs.

export async function logActivity(action: string, roomSlug?: string, metadata: any = {}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action,
    room_slug: roomSlug,
    metadata,
  });
}

// ─── System-context audit (no user, no cookies) ───────────────────────────
// Used by webhooks and background jobs. Bypasses RLS via service-role.
// Throwing here would 5xx the webhook — we always swallow and console.error.

export async function logSystemActivity(
  action: string,
  orgId: string,
  metadata: Record<string, unknown> = {},
  roomSlug?: string,
): Promise<void> {
  const client = createServiceClient();
  if (!client) return;
  try {
    await client.from('activity_logs').insert({
      user_id: null,
      org_id: orgId,
      action,
      room_slug: roomSlug || null,
      metadata,
    });
  } catch (err) {
    console.error('[audit] system log failed:', action, err);
  }
}
