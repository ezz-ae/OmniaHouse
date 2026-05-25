import { NextResponse } from 'next/server';
import { recordOperationAction } from '@/lib/operations/store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const activity = await recordOperationAction({
      action: body.action || 'operation.action',
      entity: body.entity || 'unknown',
      detail: body.detail,
      actor: body.actor,
    });
    return NextResponse.json({ ok: true, activity });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not record action' }, { status: 400 });
  }
}
