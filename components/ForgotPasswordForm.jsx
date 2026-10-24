'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { CircleAlert, Loader2, MailCheck } from 'lucide-react';
import { requestPasswordReset } from '@/app/auth/actions';
import NotConfigured from '@/components/NotConfigured';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export default function ForgotPasswordForm({ linkFailed, configured }) {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  const errors = state?.errors || {};
  const error = state?.error || (!state && linkFailed && 'That reset link didn’t work. It may have expired or already been used; ask for a new one.');

  if (state?.sentTo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If <span className="font-medium text-foreground">{state.sentTo}</span> has an account, we sent a reset link. Open it to choose a new password.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Alert>
            <MailCheck />
            <AlertTitle>No email?</AlertTitle>
            <AlertDescription>Check spam, or wait a few minutes. The link works once, within an hour.</AlertDescription>
          </Alert>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Back to log in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot your password?</CardTitle>
        <CardDescription>Enter your account’s email and we’ll send you a link to choose a new one.</CardDescription>
      </CardHeader>
      <CardContent>
        {!configured && <NotConfigured />}
        {/* Inputs are uncontrolled, so a fresh key per response refills the email after an error. */}
        <form action={action} key={state?.values?.email}>
          <FieldGroup>
            {error && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(errors.email)} defaultValue={state?.values?.email} />
              {errors.email && <FieldError>{errors.email}</FieldError>}
            </Field>
            <Field>
              <Button type="submit" size="lg" disabled={pending || !configured}>
                {pending && <Loader2 className="animate-spin" />}
                Send reset link
              </Button>
              <FieldDescription className="text-center">
                Remembered it?{' '}
                <Link href="/login" className="underline underline-offset-4">
                  Log in
                </Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
