import { NextResponse } from 'next/server';
import { createRetargeting } from '@/lib/operations/store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const retargeting = await createRetargeting(body);
    return NextResponse.json({ ok: true, retargeting });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not create retargeting record' }, { status: 400 });
  }
}
