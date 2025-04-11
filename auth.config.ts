import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from "next-auth/providers/google";
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sql } from '@vercel/postgres';
import { User } from './app/lib/definitions';

async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await sql<User>`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0];
  } catch (error) {
    throw new Error('Failed to fetch user.');
  }
}

async function createUserFromGoogle(name: string, email: string): Promise<User> {
  try {
    // Generate a random password for Google users since the field is required
    const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
    
    const result = await sql<User>`
      INSERT INTO users (name, email, password)
      VALUES (${name}, ${email}, ${randomPassword})
      RETURNING *
    `;
    
    return result.rows[0];
  } catch (error) {
    console.error('Failed to create user from Google:', error);
    throw new Error('Failed to create user from Google sign-in.');
  }
}

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email && user.name) {
        try {
          // Check if user exists
          const existingUser = await getUser(user.email);
          if (!existingUser) {
            // Create new user if they don't exist
            await createUserFromGoogle(user.name, user.email);
          }
          return true;
        } catch (error) {
          console.error('Error in Google sign in:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // For Google sign-in, we need to fetch the user from our database
        if (account?.provider === 'google' && user.email) {
          const dbUser = await getUser(user.email);
          if (dbUser) {
            token.id = dbUser.id;
          }
        } else {
          token.id = (user as User).id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);
          if (!user) return null;
          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) return user;
        }
        return null;
      },
    })
  ],
} satisfies NextAuthConfig;