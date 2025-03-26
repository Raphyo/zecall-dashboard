import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default NextAuth(authConfig).auth;

export function middleware(request: NextRequest) {
  // Skip auth for Stripe webhook
  if (request.nextUrl.pathname === '/api/stripe/webhook') {
    return NextResponse.next();
  }

  // Your existing middleware logic here...
}

// Configure matcher to include webhook route but still protect other routes
export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/stripe/webhook (Stripe webhook)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/stripe/webhook|_next/static|_next/image|favicon.ico).*)',
  ],
};