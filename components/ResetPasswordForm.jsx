'use client';

import { useActionState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleAlert, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updatePassword } from '@/app/auth/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

// Reached from the reset email's link (which signs the player in) or from "Change password" in the account menu.
export default function ResetPasswordForm({ email }) {
  const [state, action, pending] = useActionState(updatePassword, null);
  const errors = state?.errors || {};
  const router = useRouter();

  // The Toaster lives in the root layout, so the toast survives the move to the landing page.
  useEffect(() => {
    if (!state?.changed) return;
    toast.success('Password changed', { description: 'Use it next time you log in.' });
    router.replace('/');
  }, [state, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>
          For <span className="font-medium text-foreground">{email}</span>. You’ll stay signed in on this device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action}>
          {/* Lets password managers save the new password against the right account. */}
          <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
          <FieldGroup>
            {state?.error && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>
                  <p>
                    {state.error}{' '}
                    <Link href="/forgot-password" className="underline underline-offset-4">
                      Get a reset link
                    </Link>
                  </p>
                </AlertDescription>
              </Alert>
            )}
            <Field data-invalid={Boolean(errors.password)}>
              <FieldLabel htmlFor="password">New password</FieldLabel>
              <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-invalid={Boolean(errors.password)} />
              {errors.password ? <FieldError>{errors.password}</FieldError> : <FieldDescription>At least 8 characters.</FieldDescription>}
            </Field>
            <Field data-invalid={Boolean(errors.confirm)}>
              <FieldLabel htmlFor="confirm">Type it again</FieldLabel>
              <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} aria-invalid={Boolean(errors.confirm)} />
              {errors.confirm && <FieldError>{errors.confirm}</FieldError>}
            </Field>
            <Field>
              <Button type="submit" size="lg" disabled={pending || state?.changed}>
                {pending && <Loader2 className="animate-spin" />}
                Save new password
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/">Back to the game</Link>
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
