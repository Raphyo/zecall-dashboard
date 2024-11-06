import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  debug: false, // Disable debug mode
  providers: [],
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      
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