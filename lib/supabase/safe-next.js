// Where to send a player after they sign in. Only paths on this site, so a crafted ?next= link
// can't bounce them to another domain. Browsers read '//x', '/\x' and '/<tab>/x' as off-site URLs,
// so backslashes and control characters are refused anywhere in the path.
export function safeNext(next) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || /[\\\x00-\x1f\x7f]/.test(next)) return '/';
  const path = next.split(/[?#]/)[0];
  if (path === '/login' || path === '/signup' || path === '/auth' || path.startsWith('/auth/')) return '/';
  return next;
}
