import { NextResponse } from 'next/server';
import { operationsSnapshot } from '@/lib/operations/store';
import { buildInventoryAnalysis } from '@/lib/inventory/analysis';

export async function GET() {
  try {
    const state = await operationsSnapshot();
    const analysis = buildInventoryAnalysis(state);
    return NextResponse.json({ ok: true, analysis });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not build inventory analysis' }, { status: 500 });
  }
}
