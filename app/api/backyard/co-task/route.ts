import { NextResponse } from 'next/server';

/**
 * POST /api/backyard/co-task
 * Body: { id: string, action: 'accept' | 'reject' | 'complete' }
 *
 * The helper acts on a help request. On 'complete' the SQL trigger
 * tr_update_collaboration_stats bumps help_given_count (helper) +
 * help_received_count (requester) and awards 50 bonus XP to the helper.
 *
 * In mock mode we echo the action with the next status so the UI can
 * advance even without a wired backend.
 */
export async function POST(req: Request) {
  const { id, action } = await req.json();
  if (!id || !action) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
  }

  const next_status =
    action === 'accept' ? 'accepted' :
    action === 'reject' ? 'rejected' :
    action === 'complete' ? 'completed' :
    'pending';

  // TODO when Supabase is wired: update co_tasks row + let the trigger handle stats.
  return NextResponse.json({
    ok: true,
    mode: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'real' : 'mock',
    id,
    status: next_status,
    xp_awarded: action === 'complete' ? 50 : 0,
  });
}
