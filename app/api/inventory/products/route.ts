import { NextResponse } from 'next/server';
import { createManagedProduct, listManagedProducts } from '@/lib/operations/store';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';
  const data = await listManagedProducts(q);
  return NextResponse.json({ ok: true, ...data });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.master_sku || !body.display_title) {
      return NextResponse.json({ ok: false, error: 'master_sku and display_title are required' }, { status: 400 });
    }
    const product = await createManagedProduct(body);
    return NextResponse.json({ ok: true, product });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not create product' }, { status: 400 });
  }
}
