import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** The identity shown in the top bar, derived from Supabase user metadata. */
export interface DoctorIdentity {
  email: string;
  /** Display name collected at sign-up, e.g. "Dr. S. Kulkarni". */
  name: string;
  /** Clinical role collected at sign-up, e.g. "Infection Control Lead". */
  role: string;
  /** 1-2 letter monogram for the avatar. */
  initials: string;
}

export function initialsFor(name: string, email: string) {
  const source = name.trim() || email;
  const words = source
    // "Dr. S. Kulkarni" -> monogram should read SK, not DS
    .replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Reads the signed-in doctor for Server Components. Returns null when there is
 * no session — routes are already gated by middleware, so this is for display,
 * not for access control.
 */
export async function getDoctorIdentity(): Promise<DoctorIdentity | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name = typeof meta.full_name === "string" ? meta.full_name : "";
  const role = typeof meta.role === "string" ? meta.role : "";
  const email = user.email ?? "";

  return {
    email,
    name: name || email,
    role: role || "Clinician",
    initials: initialsFor(name, email),
  };
}
