import { NextResponse } from 'next/server';
import { updateSignal } from '@/lib/operations/store';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const signal = await updateSignal(decodeURIComponent(params.id), body);
    return NextResponse.json({ ok: true, signal });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not update signal' }, { status: 400 });
  }
}
