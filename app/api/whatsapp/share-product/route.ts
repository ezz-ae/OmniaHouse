import { NextResponse } from 'next/server';
import { recordProductShare } from '@/lib/operations/store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.product_sku || !body.customer_phone) {
      return NextResponse.json({ ok: false, error: 'product_sku and customer_phone are required' }, { status: 400 });
    }
    const result = await recordProductShare(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not share product' }, { status: 400 });
  }
}
