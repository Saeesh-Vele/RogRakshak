"use client";

import { Suspense, useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { AFTER_LOGIN_PATH, isSupabaseConfigured } from "@/lib/supabase/config";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/states";
import { Field, FormError, SetupRequired } from "@/components/auth/form-parts";

/** Supabase's own message, made actionable where we can name the cause. */
function signInMessage(message: string, status?: number): string {
  if (message === "Invalid login credentials") return "Incorrect email or password.";
  if (status === 0 || /fetch|network/i.test(message)) {
    return `Couldn't reach the sign-in service (${message}). Check your connection and try again.`;
  }
  return message;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get("error"));

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

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setSubmitting(false);
        setError(signInMessage(signInError.message, signInError.status));
        return;
      }
    } catch (err) {
      setSubmitting(false);
      setError(signInMessage(err instanceof Error ? err.message : "Sign-in failed", 0));
      return;
    }

    // refresh() re-runs the Server Components so the top bar picks up the
    // identity before the dashboard paints.
    router.replace(redirectTo);
    router.refresh();
  }

  const described = error ? errorId : undefined;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field id="email" label="Work email">
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          aria-invalid={error ? true : undefined}
          aria-describedby={described}
          required
        />
      </Field>

      <Field id="password" label="Password">
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            aria-invalid={error ? true : undefined}
            aria-describedby={described}
            className="pr-11"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-pressed={showPassword}
            aria-controls="password"
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground max-sm:w-11"
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </Field>

      {error && <FormError id={errorId}>{error}</FormError>}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="animate-fade-in">
      <p className="label-caps">Infection control</p>
      <h1 className="mt-2 font-display text-title text-foreground">Sign in</h1>
      <p className="mt-2 text-copy text-muted-foreground">
        Surveillance access for authorised infection control staff.
      </p>

      <div className="mt-8">
        {isSupabaseConfigured ? (
          <Suspense
            fallback={
              <div className="space-y-5" aria-hidden>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        ) : (
          <SetupRequired />
        )}
      </div>

      {/* Accounts are provisioned by a developer, never self-service. */}
      <p className="mt-8 border-t border-border pt-5 text-ui text-muted-foreground">
        Accounts are provisioned by your system administrator. There is no
        self-service sign-up.
      </p>
    </div>
  );
}
