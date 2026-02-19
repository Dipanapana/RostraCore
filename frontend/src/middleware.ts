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
  //    In production, the httpOnly cookie is set by the backend via
  //    Vercel rewrites (same-origin). In development, Next.js rewrites
  //    proxy API calls but don't forward Set-Cookie headers reliably.
  //
  //    The client-side AuthContext handles auth state via localStorage
  //    and redirects unauthenticated users to /login. The middleware
  //    acts as an additional guard when the cookie is available.
  // ------------------------------------------------------------------
  const token = request.cookies.get('access_token')?.value

  if (!token) {
    // In development, skip redirect — let client-side AuthContext handle auth.
    // In production, the httpOnly cookie is always set via same-origin Vercel rewrites.
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.next()
    }

    const loginUrl = new URL('/login', request.url)
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
