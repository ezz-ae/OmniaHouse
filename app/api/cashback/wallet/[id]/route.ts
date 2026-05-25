import { NextResponse } from 'next/server';
import { operationsSnapshot } from '@/lib/operations/store';
import { promises as fs } from 'fs';
import path from 'path';

const STORE_FILE = path.join(process.cwd(), '.data', 'operations-store.json');

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const state = await operationsSnapshot();
    const entry = state.wallet_entries.find((e) => e.id === decodeURIComponent(params.id));
    if (!entry) return NextResponse.json({ ok: false, error: 'Wallet entry not found' }, { status: 404 });
    Object.assign(entry, body);
    state.activity.unshift({
      id: `act_${Date.now().toString(36)}`, at: new Date().toISOString(),
      actor: 'finance', action: 'wallet.entry_updated', entity: entry.id, detail: `${entry.status} · ${entry.amount_aed} AED`,
    });
    await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
    await fs.writeFile(STORE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    return NextResponse.json({ ok: true, entry });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not update wallet entry' }, { status: 400 });
  }
}
