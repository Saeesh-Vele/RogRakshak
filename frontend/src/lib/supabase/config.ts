/**
 * Supabase Auth configuration.
 *
 * Auth reuses the *same* Supabase project that already backs the clinical
 * Postgres database (`DATABASE_URL` in backend/.env) — there is no second
 * project. Only the public URL and the anon key are needed on the frontend;
 * the anon key is safe to ship to the browser and is unrelated to the Postgres
 * credentials the backend uses.
 */

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Whether auth is wired up at all. When the env vars are missing we fail
 * *closed* in middleware (redirect to /login) and surface an explicit setup
 * message on the auth pages, rather than silently letting everyone in.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Where a signed-in doctor lands, and where middleware sends them back to. */
export const AFTER_LOGIN_PATH = "/dashboard";
