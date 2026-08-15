import { AlertTriangle } from "lucide-react";

/**
 * Form primitives for /login, matching the label + hint + inline-alert pattern
 * already used by the New Investigation form.
 */

export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-[0.8125rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg bg-risk-high p-3.5 text-sm text-risk-high-foreground"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/**
 * Shown instead of a form when the Supabase env vars are absent, so the failure
 * is legible rather than a generic network error.
 */
export function SetupRequired() {
  return (
    <div className="space-y-2 rounded-lg bg-risk-medium p-4 text-[0.8125rem] leading-relaxed text-risk-medium-foreground">
      <p className="font-semibold">Authentication is not configured</p>
      <p>
        Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
        <code className="font-mono">frontend/.env.local</code> (Supabase
        Dashboard → Project Settings → API), then restart the dev server.
      </p>
    </div>
  );
}
