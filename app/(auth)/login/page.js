import LoginForm from '@/components/LoginForm';
import { supabaseConfigured } from '@/lib/supabase/config';

export const metadata = { title: 'Log in' };

export default async function Page({ searchParams }) {
  const { next, error } = await searchParams;
  return <LoginForm next={typeof next === 'string' ? next : '/'} confirmFailed={error === 'confirm'} configured={supabaseConfigured} />;
}
