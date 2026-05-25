import { NextResponse } from 'next/server';
import { createHelpRequest, operationsSnapshot } from '@/lib/operations/store';

export async function GET() {
  const state = await operationsSnapshot();
  return NextResponse.json({ ok: true, requests: state.help_requests });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.posted_by || !body.title || !body.detail) {
      return NextResponse.json({ ok: false, error: 'posted_by, title, detail are required' }, { status: 400 });
    }
    const skill = typeof body.skill_needed === 'string' ? body.skill_needed.split(',').map((s: string) => s.trim()).filter(Boolean) : body.skill_needed;
    const help = await createHelpRequest({ ...body, skill_needed: skill });
    return NextResponse.json({ ok: true, help });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not post help' }, { status: 400 });
  }
}
