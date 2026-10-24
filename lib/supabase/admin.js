import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './config';

// Supabase with the secret (service-role) key. It bypasses row-level security, so it's the only way to write
// saves, and it must never reach the browser: `server-only` fails the build if a client component imports this.
// Only Server Actions use it, after getPlayer() has checked who's asking.
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

export const adminConfigured = Boolean(SUPABASE_URL && SECRET_KEY);

let client;
export function createAdminClient() {
  if (!adminConfigured) throw new Error('SUPABASE_SECRET_KEY is not set');
  client ??= createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  return client;
}
