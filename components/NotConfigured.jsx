import { Settings } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Shown on /login and /signup when the Supabase env vars are missing, so nobody can get in.
export default function NotConfigured() {
  return (
    <Alert className="mb-6">
      <Settings />
      <AlertTitle>Sign-in isn’t set up yet</AlertTitle>
      <AlertDescription>
        Add the Supabase URL and publishable key to <code>.env.local</code> (see <code>.env.example</code>), then restart the server.
      </AlertDescription>
    </Alert>
  );
}
