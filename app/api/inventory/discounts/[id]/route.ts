import { NextResponse } from 'next/server';
import { updateCoupon } from '@/lib/operations/store';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const coupon = await updateCoupon(decodeURIComponent(params.id), body);
    return NextResponse.json({ ok: true, coupon });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not update coupon' }, { status: 400 });
  }
}
