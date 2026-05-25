import { NextResponse } from 'next/server';
import { awardXp, operationsSnapshot } from '@/lib/operations/store';

export async function GET() {
  const state = await operationsSnapshot();
  return NextResponse.json({ ok: true, xp: state.xp });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.team_member_id || !body.reason || body.amount === undefined) {
      return NextResponse.json({ ok: false, error: 'team_member_id, reason, amount are required' }, { status: 400 });
    }
    const entry = await awardXp({
      team_member_id: body.team_member_id,
      reason: body.reason,
      amount: Number(body.amount),
      source: body.source,
    });
    return NextResponse.json({ ok: true, entry });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not award XP' }, { status: 400 });
  }
}
