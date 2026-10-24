// Public Supabase settings. Both are safe to ship to the browser; row-level security guards the data.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Without them nobody can sign in, so the middleware sends every page to /login, which explains what's missing.
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
