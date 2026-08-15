import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Sign-out handler. POST only — a GET would let any <img> tag or prefetch log
 * the doctor out.
 */
export async function POST() {
  if (isSupabaseConfigured) {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  // A relative Location keeps the browser on whichever host it used. Deriving
  // an absolute URL from the request would rewrite the origin (Next reports the
  // server's configured hostname, not the Host header), which would strand the
  // just-cleared cookies on the original origin.
  return new Response(null, {
    // 303 so the browser follows with GET rather than re-POSTing to /login.
    status: 303,
    headers: { Location: "/login" },
  });
}
