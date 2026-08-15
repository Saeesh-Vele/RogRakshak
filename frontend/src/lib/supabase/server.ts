import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "./config";

/**
 * Server-component / route-handler Supabase client.
 *
 * Server Components cannot write cookies, so `setAll` is a no-op there; the
 * middleware (see src/middleware.ts) is what refreshes and re-issues the
 * session cookies on every request.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — middleware handles the refresh.
        }
      },
    },
  });
}
