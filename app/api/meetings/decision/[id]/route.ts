import { NextResponse } from 'next/server';
import { operationsSnapshot } from '@/lib/operations/store';
import { promises as fs } from 'fs';
import path from 'path';

const STORE_FILE = path.join(process.cwd(), '.data', 'operations-store.json');

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const state = await operationsSnapshot();
    const decision = state.decisions.find((d) => d.id === decodeURIComponent(params.id));
    if (!decision) return NextResponse.json({ ok: false, error: 'Decision not found' }, { status: 404 });
    Object.assign(decision, body);
    await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
    await fs.writeFile(STORE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    return NextResponse.json({ ok: true, decision });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not update decision' }, { status: 400 });
  }
}
