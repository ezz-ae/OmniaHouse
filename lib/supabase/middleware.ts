import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { requireSupabaseServerConfig } from './config';

const SESSION_RESPONSE_HEADERS = ['cache-control', 'expires', 'pragma'];

export function createMiddlewareClient(request: NextRequest) {
  const { url, key } = requireSupabaseServerConfig();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  return {
    supabase,
    get response() {
      return response;
    },
  };
}

export function redirectWithSessionCookies(url: URL, response: NextResponse) {
  const redirect = NextResponse.redirect(url);

  response.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });

  SESSION_RESPONSE_HEADERS.forEach((header) => {
    const value = response.headers.get(header);
    if (value) redirect.headers.set(header, value);
  });

  return redirect;
}
