// Add to existing definitions
export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  created_at: string;
};

export type Campaign = {
  id: string;
  name: string;
  status: 'brouillon' | 'planifiée' | 'en-cours' | 'terminée';
  knowledge_base: string;
  knowledge_base_type: 'pdf' | 'text';
  contacts_file: string;
  contacts_count: number;
  scheduled_date: string;
  llm_prompt: string;
  created_at: string;
  user_id: string;
};

import type { DefaultSession } from 'next-auth';
import type { JWT as NextAuthJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    token?: string;
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    jwt?: string;
    email?: string | null;
  }
}