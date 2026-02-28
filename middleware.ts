import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request)

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - / (landing page)
     * - /login
     * - /signup
     * - /mfa/* (MFA flow)
     * - /api/auth/* (Better Auth endpoints)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, static files
     */
    '/((?!$|login|signup|mfa|contact|api/auth|api/contact|api/stripe|_next|favicon\\.ico).*)',
  ],
}
