import { NextResponse } from 'next/server';
import { redeemPerk, operationsSnapshot } from '@/lib/operations/store';

export async function GET() {
  const state = await operationsSnapshot();
  return NextResponse.json({ ok: true, perks: state.perks });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.perk_id) return NextResponse.json({ ok: false, error: 'perk_id is required' }, { status: 400 });
    const perk = await redeemPerk({ perk_id: body.perk_id, actor: body.actor || 'operator' });
    return NextResponse.json({ ok: true, perk });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not redeem perk' }, { status: 400 });
  }
}
