import { updateSession } from '@/lib/supabase/middleware';

export function middleware(request) {
  return updateSession(request);
}

export const config = {
  // Everything except Next's build files and static images.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)']
};
