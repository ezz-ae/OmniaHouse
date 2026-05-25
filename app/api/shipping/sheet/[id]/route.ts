import { NextResponse } from 'next/server';
import { updateCourierSheet } from '@/lib/operations/store';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const sheet = await updateCourierSheet(decodeURIComponent(params.id), body);
    return NextResponse.json({ ok: true, sheet });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not update sheet' }, { status: 400 });
  }
}
