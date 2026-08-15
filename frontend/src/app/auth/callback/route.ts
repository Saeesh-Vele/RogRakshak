import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AFTER_LOGIN_PATH, isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Email-confirmation callback. Supabase sends the doctor here with a `code`
 * after they click the confirmation link; exchanging it establishes the session
 * cookies and drops them straight into the dashboard.
 */

/** Relative redirect, so the response stays on the host the browser used. */
function redirectTo(path: string) {
  return new Response(null, { status: 303, headers: { Location: path } });
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? AFTER_LOGIN_PATH;

  if (code && isSupabaseConfigured) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Only ever a same-origin path — "//evil.example" is not one.
      const target =
        next.startsWith("/") && !next.startsWith("//") ? next : AFTER_LOGIN_PATH;
      return redirectTo(target);
    }
  }

  const message =
    "That confirmation link is invalid or has expired. Please sign in again.";
  return redirectTo(`/login?error=${encodeURIComponent(message)}`);
}
