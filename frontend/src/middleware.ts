import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Routes that are accessible without authentication.
 * These are checked with an exact pathname match.
 */
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/landing',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/pricing',
  '/industries',
]

/**
 * Path prefixes that are always public regardless of deeper segments.
 * An API route prefix is included so that auth endpoints (e.g. /api/auth/login)
 * are reachable before a token exists.
 */
const PUBLIC_PREFIXES = ['/api/', '/industries/']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ------------------------------------------------------------------
  // 1. Always allow public routes (exact match)
  // ------------------------------------------------------------------
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next()
  }

  // ------------------------------------------------------------------
  // 2. Always allow public route prefixes
  // ------------------------------------------------------------------
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // ------------------------------------------------------------------
  // 3. Allow Next.js internals and static assets
  //    Covers /_next/*, /favicon*, and any path with a file extension
  //    (e.g. .svg, .png, .ico, .js, .css, .woff2).
  // ------------------------------------------------------------------
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    // A dot anywhere in the last segment almost certainly means a static file.
    // This avoids blocking routes like /roster/2024-01-01 which contain hyphens.
    /\.[^/]+$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  // ------------------------------------------------------------------
  // 4. Redirect the bare root to /dashboard for authenticated users,
  //    or to /login for unauthenticated users (handled below).
  // ------------------------------------------------------------------

  // ------------------------------------------------------------------
  // 5. Authentication check
  //    The API sets an httpOnly cookie named `access_token` on login.
  //    We cannot reach localStorage from middleware (edge runtime), so
  //    the cookie is the sole source of truth here.
  // ------------------------------------------------------------------
  const token = request.cookies.get('access_token')?.value

  if (!token) {
    // Preserve the originally-requested path so the login page can
    // redirect back after a successful sign-in.
    const loginUrl = new URL('/login', request.url)

    // Only set a redirect param for non-root paths to keep the URL clean.
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname)
    }

    return NextResponse.redirect(loginUrl)
  }

  // ------------------------------------------------------------------
  // 6. Token present — allow the request through.
  //
  //    Fine-grained role-based access control (RBAC) is enforced
  //    client-side using the `canAccessRoute` helper in
  //    `src/config/permissions.ts`.  This is acceptable because:
  //
  //    a) The JWT cannot be decoded efficiently in the edge runtime
  //       without pulling in a crypto library.
  //    b) All sensitive data is protected by server-side API guards
  //       regardless of what the client renders.
  //    c) The client-side guard prevents accidental navigation to
  //       unauthorised pages and provides a good UX (redirect to /dashboard).
  //
  //    If you later add role claims to the cookie (or use a short-lived
  //    opaque session cookie verified against an edge KV store), upgrade
  //    this middleware to enforce RBAC here as well.
  // ------------------------------------------------------------------
  return NextResponse.next()
}

/**
 * Middleware matcher.
 *
 * Excludes Next.js static file directories and image optimisation routes
 * at the framework level so those requests never reach the middleware
 * function body (performance optimisation).
 */
export const config = {
  matcher: [
    /*
     * Match every path EXCEPT:
     *  - _next/static  (compiled JS/CSS bundles)
     *  - _next/image   (Next.js image optimisation endpoint)
     *  - favicon.ico   (browser default favicon request)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
