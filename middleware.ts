import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default NextAuth(authConfig).auth;

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: [
    // Protect all routes except:
    // - api/stripe/webhook (webhook endpoint)
    // - api/auth (auth endpoints)
    // - _next (Next.js internals)
    // - static files
    '/((?!api/stripe/webhook|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};

export function middleware(request: NextRequest) {
  // Your existing middleware logic here
  return NextResponse.next()
}