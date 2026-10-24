import SignupForm from '@/components/SignupForm';
import { supabaseConfigured } from '@/lib/supabase/config';

export const metadata = { title: 'Sign up' };

export default function Page() {
  return <SignupForm configured={supabaseConfigured} />;
}
