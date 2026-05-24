import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAuthPage = req.nextUrl.pathname === '/login';

  // Session Security: Location Enforcement
  if (session) {
    const currentIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const officeIp = process.env.OFFICE_IP || '94.200.0.1'; // Example UAE Static IP

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

    // If logged in from office but current session is from elsewhere, or vice-versa
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