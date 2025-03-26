import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

const auth = NextAuth(authConfig).auth;

export default async function middleware(req: any) {
  // Bypass auth for Stripe webhook
  if (req.nextUrl.pathname === '/api/stripe/webhook') {
    return;
  }

  // Apply auth middleware for all other routes
  return auth(req);
}

export const config = {
  matcher: ['/((?!api/stripe/webhook|_next/static|_next/image|.*\\.png$).*)'],
};