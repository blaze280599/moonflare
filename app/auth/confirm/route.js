import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/supabase/safe-next';

// The link in Supabase's confirmation email lands here. The default email sends a one-time `code`
// (works only in the browser that signed up); a template using {{ .TokenHash }} sends `token_hash`
// and `type` instead, which works on any device. Both are handled. Password reset links land here too
// (`type=recovery`, `next=/reset-password`): either way the player is signed in, then sent to `next`.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = safeNext(searchParams.get('next'));

  const supabase = await createClient();
  let error = new Error('No code in link');
  if (tokenHash && type) ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  else if (code) ({ error } = await supabase.auth.exchangeCodeForSession(code));

  if (!error) return NextResponse.redirect(`${origin}${next}`);
  // A dead reset link goes back to the form that sends a new one; a `code` link carries no `type`, so check `next` too.
  const recovery = type === 'recovery' || next.startsWith('/reset-password');
  return NextResponse.redirect(recovery ? `${origin}/forgot-password?error=link` : `${origin}/login?error=confirm`);
}
