import { createMiddlewareClient, redirectWithSessionCookies } from '@/lib/supabase/middleware';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { NextResponse, type NextRequest } from 'next/server';

const MOCK_AUTH_ALLOWED =
  process.env.NODE_ENV !== 'production' || process.env.ALLOW_MOCK_AUTH === 'true';

const PUBLIC_PREFIXES = ['/portal/', '/auth/callback', '/auth/confirm'];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isAuthPage = path === '/login' || path === '/';

  if (PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (!isSupabaseConfigured()) {
    return handlePasskeyFallback(req, isAuthPage);
  }

  // The passkey gate works alongside Supabase. The owner can hold an
  // oh_passkey cookie (issued by /api/auth/passkey) and walk in even when
  // Supabase is configured but no auth.users row has been provisioned for
  // them yet. Without this, a correct passkey lands the cookie and then
  // the next request is bounced back to /login because no Supabase session
  // exists — the exact symptom of "passkey wrong even when correct".
  const hasPasskey = req.cookies.get('oh_passkey')?.value === 'open';
  if (hasPasskey) {
    if (isAuthPage) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/house';
      redirectUrl.search = '';
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  }

  const session = createMiddlewareClient(req);
  const { data, error } = await session.supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  if ((error || !claims?.sub) && !isAuthPage) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('next', path);
    return redirectWithSessionCookies(redirectUrl, session.response);
  }

  if (claims?.sub) {
    const currentIp = getRequestIp(req);
    const officeIp = process.env.OFFICE_IP || '94.200.0.1';

    const { data: roleData } = await session.supabase
      .from('user_roles')
      .select('last_sign_in_ip, is_locked')
      .eq('user_id', claims.sub)
      .limit(1)
      .maybeSingle();

    if (roleData?.is_locked) {
      await session.supabase.auth.signOut();

      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('error', 'account_locked');
      return redirectWithSessionCookies(redirectUrl, session.response);
    }

    if (roleData?.last_sign_in_ip && roleData.last_sign_in_ip !== currentIp) {
      const movedToOrFromOffice = roleData.last_sign_in_ip === officeIp || currentIp === officeIp;

      if (movedToOrFromOffice) {
        await session.supabase.auth.signOut();

        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/login';
        redirectUrl.searchParams.set('error', 'session_location_drift');
        return redirectWithSessionCookies(redirectUrl, session.response);
      }
    }
  }

  if (claims?.sub && isAuthPage) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/house';
    redirectUrl.search = '';
    return redirectWithSessionCookies(redirectUrl, session.response);
  }

  return session.response;
}

function handlePasskeyFallback(req: NextRequest, isAuthPage: boolean) {
  if (MOCK_AUTH_ALLOWED) return NextResponse.next();

  const hasPasskey = req.cookies.get('oh_passkey')?.value === 'open';
  if (hasPasskey) return NextResponse.next();

  if (!isAuthPage) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

function getRequestIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|auth/signout).*)'],
};
