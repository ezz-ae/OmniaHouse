import { NextResponse } from 'next/server';
import { createMeeting, operationsSnapshot } from '@/lib/operations/store';

export async function GET() {
  const state = await operationsSnapshot();
  return NextResponse.json({ ok: true, meetings: state.meetings, decisions: state.decisions });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title || !body.attendees || !body.source) {
      return NextResponse.json({ ok: false, error: 'title, attendees, source are required' }, { status: 400 });
    }
    const attendees = typeof body.attendees === 'string' ? body.attendees.split(',').map((s: string) => s.trim()).filter(Boolean) : body.attendees;
    const meeting = await createMeeting({ ...body, attendees });
    return NextResponse.json({ ok: true, meeting });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not create meeting' }, { status: 400 });
  }
}
