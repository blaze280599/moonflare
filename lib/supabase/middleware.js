import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigured } from './config';

// Pages a signed-out visitor may see. Everything else needs a session, including /reset-password: the
// reset email's link goes through /auth/confirm, which signs the player in before sending them there.
const PUBLIC = ['/login', '/signup', '/forgot-password', '/auth'];
// Pages a signed-in player has no reason to see.
const GUEST_ONLY = ['/login', '/signup', '/forgot-password'];

const matches = (pathname, list) => list.some(p => pathname === p || pathname.startsWith(p + '/'));

// Refreshes the session cookie on every request, then lets the visitor through or sends them to /login.
export async function updateSession(request) {
  const { pathname, search } = request.nextUrl;
  let response = NextResponse.next({ request });

  let signedIn = false;
  if (supabaseConfigured) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    });
    // Must run before anything else reads the session, or a refreshed token can be lost.
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims);
  }

  const redirect = (path, params = {}) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = new URLSearchParams(params).toString();
    const res = NextResponse.redirect(url);
    // Keep any refreshed session cookies.
    response.cookies.getAll().forEach(c => res.cookies.set(c));
    return res;
  };

  if (!signedIn && !matches(pathname, PUBLIC)) return redirect('/login', pathname === '/' ? {} : { next: pathname + search });
  if (signedIn && matches(pathname, GUEST_ONLY)) return redirect('/');
  return response;
}
