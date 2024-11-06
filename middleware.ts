import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Initialize NextAuth middleware
export const { auth: middleware } = NextAuth(authConfig);

// Configure which routes should be protected
export const config = {
  // Protect all routes under /dashboard
  // Allow public access to auth-related routes and static files
  matcher: [
    '/dashboard/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico|login|signup).*)',
  ],
};