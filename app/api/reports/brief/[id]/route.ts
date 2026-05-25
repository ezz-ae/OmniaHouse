import { NextResponse } from 'next/server';
import { updateBrief } from '@/lib/operations/store';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const brief = await updateBrief(decodeURIComponent(params.id), body);
    return NextResponse.json({ ok: true, brief });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not update brief' }, { status: 400 });
  }
}
