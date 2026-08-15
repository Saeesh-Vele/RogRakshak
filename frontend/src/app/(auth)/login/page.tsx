"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { AFTER_LOGIN_PATH, isSupabaseConfigured } from "@/lib/supabase/config";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FormError,
  SetupRequired,
} from "@/components/auth/form-parts";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error")
  );

  /**
   * Only same-origin paths are honoured, so `?redirectTo=https://evil.example`
   * cannot turn the login screen into an open redirect.
   */
  const requested = searchParams.get("redirectTo");
  const redirectTo =
    requested && requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : AFTER_LOGIN_PATH;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setSubmitting(false);
      setError(
        signInError.message === "Invalid login credentials"
          ? "Incorrect email or password."
          : signInError.message
      );
      return;
    }

    // refresh() re-runs the Server Components so the top bar picks up the
    // identity before the dashboard paints.
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field id="email" label="Work email">
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="s.kulkarni@hospital.org"
          disabled={submitting}
          required
        />
      </Field>

      <Field id="password" label="Password">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={submitting}
          required
        />
      </Field>

      {error && <FormError>{error}</FormError>}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-[1.75rem] font-bold tracking-tight text-foreground">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clinical surveillance access for authorised infection control staff.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          {isSupabaseConfigured ? (
            <Suspense
              fallback={<div className="h-[292px] animate-pulse rounded-lg bg-muted" />}
            >
              <LoginForm />
            </Suspense>
          ) : (
            <SetupRequired />
          )}
        </CardContent>
      </Card>

      {/* Accounts are provisioned by a developer, never self-service. */}
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Access is provisioned by your system administrator.
      </p>
    </div>
  );
}
