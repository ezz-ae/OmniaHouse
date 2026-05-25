import { NextResponse } from 'next/server';
import { getManagedProduct, updateManagedProduct } from '@/lib/operations/store';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const product = await getManagedProduct(decodeURIComponent(params.id));
  if (!product) return NextResponse.json({ ok: false, error: 'Product not found' }, { status: 404 });
  return NextResponse.json({ ok: true, product });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const product = await updateManagedProduct(decodeURIComponent(params.id), body);
    return NextResponse.json({ ok: true, product });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not update product' }, { status: 400 });
  }
}
