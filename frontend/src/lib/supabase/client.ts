import { createBrowserClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "./config";

/**
 * Browser-side Supabase client, used by the login form and the sign-out
 * action. Session tokens are persisted as cookies (not localStorage)
 * so the Next.js middleware can read them server-side.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
