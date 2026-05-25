import { NextResponse } from 'next/server';
import { assignEntity, operationsSnapshot } from '@/lib/operations/store';

export async function GET() {
  const state = await operationsSnapshot();
  return NextResponse.json({ ok: true, team: state.team, assignments: state.assignments });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.team_member_id || !body.entity_kind || !body.entity_id) {
      return NextResponse.json({ ok: false, error: 'team_member_id, entity_kind, entity_id are required' }, { status: 400 });
    }
    const assignment = await assignEntity(body);
    return NextResponse.json({ ok: true, assignment });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not assign entity' }, { status: 400 });
  }
}
