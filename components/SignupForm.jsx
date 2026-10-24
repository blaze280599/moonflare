'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { CircleAlert, Loader2, MailCheck } from 'lucide-react';
import { signUp } from '@/app/auth/actions';
import NotConfigured from '@/components/NotConfigured';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export default function SignupForm({ configured }) {
  const [state, action, pending] = useActionState(signUp, null);
  const errors = state?.errors || {};
  const values = state?.values || {};
  // Read after mount: the server doesn't know the browser's zone, and reading it during render would mismatch.
  const [timeZone, setTimeZone] = useState('');
  useEffect(() => setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || ''), []);

  if (state?.sentTo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a confirmation link to <span className="font-medium text-foreground">{state.sentTo}</span>. Open it to finish signing up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <MailCheck />
            <AlertTitle>No email?</AlertTitle>
            <AlertDescription>Check spam, or wait a few minutes. The link works once.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Inputs are uncontrolled, so a fresh key per response refills them with what the player typed.
  const key = JSON.stringify(values);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign up</CardTitle>
        <CardDescription>Make an account to open albums and keep your collection.</CardDescription>
      </CardHeader>
      <CardContent>
        {!configured && <NotConfigured />}
        <form action={action} key={key}>
          {/* The daily reward resets at the player's midnight, so the account remembers their time zone. */}
          <input type="hidden" name="timezone" value={timeZone} />
          <FieldGroup>
            {state?.error && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <Field data-invalid={Boolean(errors.username)}>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                required
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z0-9_]+"
                aria-invalid={Boolean(errors.username)}
                defaultValue={values.username}
              />
              {errors.username ? <FieldError>{errors.username}</FieldError> : <FieldDescription>Shown to other players.</FieldDescription>}
            </Field>
            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(errors.email)} defaultValue={values.email} />
              {errors.email && <FieldError>{errors.email}</FieldError>}
            </Field>
            <Field data-invalid={Boolean(errors.password)}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-invalid={Boolean(errors.password)} />
              {errors.password ? <FieldError>{errors.password}</FieldError> : <FieldDescription>At least 8 characters.</FieldDescription>}
            </Field>
            <Field>
              <Button type="submit" size="lg" disabled={pending || !configured}>
                {pending && <Loader2 className="animate-spin" />}
                Create account
              </Button>
              <FieldDescription className="text-center">
                Already a member?{' '}
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
