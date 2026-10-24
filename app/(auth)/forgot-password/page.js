import ForgotPasswordForm from '@/components/ForgotPasswordForm';
import { supabaseConfigured } from '@/lib/supabase/config';

export const metadata = { title: 'Forgot password' };

export default async function Page({ searchParams }) {
  const { error } = await searchParams;
  return <ForgotPasswordForm linkFailed={error === 'link'} configured={supabaseConfigured} />;
}
