import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware: auth gate + session-location enforcement.
 *
 * When Supabase env vars are not set (early dev, mock-mode), this becomes
 * a pass-through so the UI can be developed standalone. Once Phase 2
 * provisions Supabase, the full auth path activates automatically.
 */

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Mock-mode short-circuit. No auth, no redirects — UI runs free.
  if (!SUPABASE_CONFIGURED) return res;

  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const path = req.nextUrl.pathname;
  const isAuthPage = path === '/login' || path === '/';
  // Public routes — no auth required, accessible to customers via WhatsApp link
  const isPublic = path.startsWith('/portal/');
  if (isPublic) return res;

  // Session Security: Location Enforcement
  if (session) {
    const currentIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const officeIp = process.env.OFFICE_IP || '94.200.0.1';

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('last_sign_in_ip, is_locked')
      .eq('user_id', session.user.id)
      .single();

    if (roleData?.is_locked) {
      await supabase.auth.signOut();
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('error', 'account_locked');
      return NextResponse.redirect(redirectUrl);
    }

    if (roleData?.last_sign_in_ip && roleData.last_sign_in_ip !== currentIp) {
      if (roleData.last_sign_in_ip === officeIp || currentIp === officeIp) {
        await supabase.auth.signOut();
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/login';
        redirectUrl.searchParams.set('error', 'session_location_drift');
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  // If no session and trying to access protected route
  if (!session && !isAuthPage) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  // If session exists and trying to access login, send to house
  if (session && isAuthPage) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/house';
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|auth/callback).*)'],
};
