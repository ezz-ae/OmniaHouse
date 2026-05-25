import { NextResponse } from 'next/server';
import { getRoomData } from '@/lib/operations/rooms';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const title = url.searchParams.get('title') || '';
  const description = url.searchParams.get('description') || '';
  if (!title) return NextResponse.json({ ok: false, error: 'title is required' }, { status: 400 });
  try {
    const room = await getRoomData(title, description);
    return NextResponse.json({ ok: true, room });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Failed to load room' }, { status: 500 });
  }
}
