import { AlertTriangle } from "lucide-react";

/** Form primitives for /login: label + control + optional hint. */

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
      <label htmlFor={id} className="block text-ui font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-meta text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Inline form error. role="alert" announces it; give it an `id` and point the
 * fields' aria-describedby at it so the message is read with each field.
 */
export function FormError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <div
      id={id}
      role="alert"
      className="flex items-start gap-2.5 border-l-2 border-destructive bg-risk-high py-2.5 pl-3 pr-3 text-ui text-risk-high-foreground"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
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
    <div className="space-y-2 border-l-2 border-node-downstream bg-risk-medium p-4 text-ui text-risk-medium-foreground">
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
