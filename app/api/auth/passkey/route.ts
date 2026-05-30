import { NextResponse } from 'next/server';

/**
 * Private passkey gate.
 *
 * The passkey is read from server env so it is not bundled into the public
 * frontend. This is still a lightweight internal gate, not full user auth.
 *
 * Comparison rules:
 *   • Both the configured value and the submitted value are trimmed so
 *     trailing whitespace from a copy-paste doesn't reject a correct key.
 *   • Comparison is constant-time-ish (we only branch after computing
 *     equality on equal-length strings) so timing leaks are minimised.
 */
export async function POST(req: Request) {
  const configuredPasskey = process.env.HOUSE_PASSKEY?.trim();
  if (!configuredPasskey) {
    return NextResponse.json({ ok: false, error: 'passkey_not_configured', detail: 'HOUSE_PASSKEY is not set in this environment.' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const submitted = typeof body.passkey === 'string' ? body.passkey.trim() : '';

  // Constant-time compare on equal length, otherwise short-circuit fail.
  let match = submitted.length === configuredPasskey.length;
  if (match) {
    let diff = 0;
    for (let i = 0; i < configuredPasskey.length; i++) {
      diff |= configuredPasskey.charCodeAt(i) ^ submitted.charCodeAt(i);
    }
    match = diff === 0;
  }
  if (!match) {
    return NextResponse.json({ ok: false, error: 'invalid_passkey' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, mode: 'passkey' });
  res.cookies.set('oh_passkey', 'open', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return res;
}
