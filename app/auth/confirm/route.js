import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/supabase/safe-next';

// The link in Supabase's confirmation email lands here. The default email sends a one-time `code`
// (works only in the browser that signed up); a template using {{ .TokenHash }} sends `token_hash`
// and `type` instead, which works on any device. Both are handled.
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

  return NextResponse.redirect(error ? `${origin}/login?error=confirm` : `${origin}${next}`);
}
