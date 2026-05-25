import { NextResponse } from 'next/server';
import { createCoupon, listCoupons } from '@/lib/operations/store';

export async function GET() {
  const data = await listCoupons();
  return NextResponse.json({ ok: true, ...data });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.code || !body.type || body.value === undefined) {
      return NextResponse.json({ ok: false, error: 'code, type, and value are required' }, { status: 400 });
    }
    const coupon = await createCoupon(body);
    return NextResponse.json({ ok: true, coupon });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not create coupon' }, { status: 400 });
  }
}
