import { NextResponse } from 'next/server';
import { SHORTCUTS, expandShortcuts, searchShortcuts } from '@/lib/whatsapp/shortcuts';

/**
 * GET  /api/whatsapp/shortcuts?q=welcome    → search list
 * POST /api/whatsapp/shortcuts              → expand text with /shortcut tokens
 *      Body: { text: string, language?: 'en'|'ar', vars?: {...} }
 *
 * Mock mode returns the seed in lib/whatsapp/shortcuts.ts.
 * Real mode reads from crm_shortcuts table with org_id RLS scoping.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';
  return NextResponse.json({ ok: true, shortcuts: searchShortcuts(q) });
}

export async function POST(req: Request) {
  try {
    const { text, language = 'en', vars = {} } = await req.json();
    const result = expandShortcuts(text || '', language, vars);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
