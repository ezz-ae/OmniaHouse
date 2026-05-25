import { NextResponse } from 'next/server';
import { operationsSnapshot } from '@/lib/operations/store';

export async function GET() {
  const snapshot = await operationsSnapshot();
  return NextResponse.json({ ok: true, ...snapshot });
}
