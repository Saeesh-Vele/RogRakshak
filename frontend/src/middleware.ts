import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import {
  AFTER_LOGIN_PATH,
  isSupabaseConfigured,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/supabase/config";

/**
 * Centralised route protection.
 *
 * Everything is private by default: only the marketing landing page and the
 * auth screens are public, so a new route added under src/app cannot forget to
 * protect itself. This also refreshes the Supabase session cookie on every
 * request, which is what keeps Server Components able to read the user.
 */

/**
 * Public, unauthenticated entry points. Everything else requires a session.
 *
 * There is no self-service sign-up: accounts are provisioned by a developer via
 * scripts/create_doctor.py, so /login is the only way in.
 */
const PUBLIC_PATHS = new Set(["/", "/login"]);
const AUTH_PATHS = new Set(["/login"]);

function isPublicPath(pathname: string) {
  // /auth/* holds the email-confirmation callback and the sign-out handler.
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith("/auth/");
}

function loginRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const from = request.nextUrl.pathname + request.nextUrl.search;
  if (from !== "/") url.searchParams.set("redirectTo", from);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicPath = isPublicPath(pathname);

  // Fail closed: without auth credentials configured, private routes stay shut
  // rather than falling open to anyone who guesses a URL.
  if (!isSupabaseConfigured) {
    return publicPath ? NextResponse.next() : loginRedirect(request);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() revalidates the JWT against the auth server — getSession() only
  // decodes whatever cookie the client happens to be sending, so it must not be
  // trusted for an access decision.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !publicPath) {
    return withCookies(loginRedirect(request), response);
  }

  // A signed-in doctor has no business on the login screen.
  if (user && AUTH_PATHS.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = AFTER_LOGIN_PATH;
    url.search = "";
    return withCookies(NextResponse.redirect(url), response);
  }

  return response;
}

/** Carry any refreshed session cookies onto a redirect response. */
function withCookies(redirect: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: [
    /*
     * Every path except Next.js internals and static assets. Kept as a broad
     * negative match so new app routes are covered automatically.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ico)$).*)",
  ],
};
