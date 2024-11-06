import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  debug: false,
  providers: [],
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      
      // Redirect root path to signup
      if (nextUrl.pathname === '/') {
        return Response.redirect(new URL('/signup', nextUrl));
      }
      
      // Allow access to signup page
      if (nextUrl.pathname === '/signup') {
        return true;
      }
      
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false;
      }
      
      if (isLoggedIn && !isOnDashboard) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      
      return true;
    },
  },
} satisfies NextAuthConfig;