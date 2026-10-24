'use server';

import { createHash, timingSafeEqual } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/config';
import { adminConfigured, createAdminClient } from '@/lib/supabase/admin';
import { isTimeZone } from '@/lib/save';
import { safeNext } from '@/lib/supabase/safe-next';

const USERNAME = /^[a-zA-Z0-9_]{3,20}$/;
const NOT_SET_UP = 'Sign-in isn’t set up on this site yet.';

// Hashing first gives both sides the same length, which timingSafeEqual needs.
const digest = s => createHash('sha256').update(s).digest();
const inviteMatches = code => {
  const expected = process.env.SIGNUP_INVITE_CODE;
  return Boolean(expected) && timingSafeEqual(digest(code), digest(expected));
};

const field = (formData, name) => String(formData.get(name) ?? '').trim();

// Usernames are unique regardless of case (a unique index on lower(username) in public.profiles).
// `_` is a wildcard in ILIKE, so escape it to match the name exactly.
async function usernameTaken(username) {
  if (!adminConfigured) return false;
  const { data } = await createAdminClient().from('profiles').select('id').ilike('username', username.replace(/_/g, '\\_')).limit(1);
  return Boolean(data?.length);
}

export async function logIn(_prev, formData) {
  const email = field(formData, 'email');
  const values = { email };
  if (!supabaseConfigured) return { error: NOT_SET_UP, values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: String(formData.get('password') ?? '') });
  if (error) {
    const messages = {
      invalid_credentials: 'Wrong email or password.',
      email_not_confirmed: 'Confirm your email first. Check your inbox for the link.'
    };
    return { error: messages[error.code] || 'Couldn’t log you in. Try again in a moment.', values };
  }
  redirect(safeNext(formData.get('next')));
}

export async function signUp(_prev, formData) {
  const username = field(formData, 'username');
  const email = field(formData, 'email');
  const password = String(formData.get('password') ?? '');
  const invite = field(formData, 'invite');
  // Filled by the browser. The daily reward resets at midnight in this zone; a bad value just leaves it unset.
  const timeZone = field(formData, 'timezone');
  const values = { username, email };
  if (!supabaseConfigured) return { error: NOT_SET_UP, values };

  const errors = {};
  if (!USERNAME.test(username)) errors.username = 'Use 3–20 letters, numbers or underscores.';
  if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email.';
  if (password.length < 8) errors.password = 'Use at least 8 characters.';
  if (!inviteMatches(invite)) errors.invite = 'That invite code isn’t right.';
  if (!errors.username && (await usernameTaken(username))) errors.username = 'That username is taken.';
  if (Object.keys(errors).length) return { errors, values };

  const origin = (await headers()).get('origin');
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, ...(isTimeZone(timeZone) && { timezone: timeZone }) }, emailRedirectTo: `${origin}/auth/confirm` }
  });
  if (error) {
    if (error.code === 'weak_password') return { errors: { password: error.message }, values };
    if (error.code === 'over_email_send_rate_limit') return { error: 'Too many sign-ups just now. Try again in an hour.', values };
    return { error: 'Couldn’t create your account. Try again.', values };
  }
  // With email confirmation off, Supabase signs the player straight in.
  if (data.session) redirect('/');
  return { sentTo: email };
}

export async function signOut() {
  if (supabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect('/login');
}
