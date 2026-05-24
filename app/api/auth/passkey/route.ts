import { NextResponse } from 'next/server';

/**
 * Private passkey gate.
 *
 * The passkey is read from server env so it is not bundled into the public
 * frontend. This is still a lightweight internal gate, not full user auth.
 */
export async function POST(req: Request) {
  const configuredPasskey = process.env.HOUSE_PASSKEY?.trim();
  if (!configuredPasskey) {
    return NextResponse.json({ ok: false, error: 'passkey_not_configured' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const passkey = typeof body.passkey === 'string' ? body.passkey : '';
  if (passkey !== configuredPasskey) {
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
