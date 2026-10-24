'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { CircleAlert, Loader2 } from 'lucide-react';
import { logIn } from '@/app/auth/actions';
import NotConfigured from '@/components/NotConfigured';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export default function LoginForm({ next, confirmFailed, configured }) {
  const [state, action, pending] = useActionState(logIn, null);
  const error = state?.error || (confirmFailed && 'That confirmation link didn’t work. It may have expired; try logging in.');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Sign in to open albums and fill your binder.</CardDescription>
      </CardHeader>
      <CardContent>
        {!configured && <NotConfigured />}
        <form action={action}>
          <input type="hidden" name="next" value={next} />
          <FieldGroup>
            {error && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} />
            </Field>
            <Field>
              <div className="flex items-center">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Link href="/forgot-password" className="ml-auto text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </Field>
            <Field>
              <Button type="submit" size="lg" disabled={pending || !configured}>
                {pending && <Loader2 className="animate-spin" />}
                Log in
              </Button>
              <FieldDescription className="text-center">
                New here?{' '}
                <Link href="/signup" className="underline underline-offset-4">
                  Sign up
                </Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
