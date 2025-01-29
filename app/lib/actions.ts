'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

// Type for the registration state
type RegisterState = {
  message: string;
  success: boolean;
};

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      redirect: true,
      callbackUrl: '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

export async function register(
  prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const phoneNumber = formData.get('phoneNumber') as string;

    if (!name || !email || !password || !phoneNumber) {
      return {
        message: 'Missing required fields',
        success: false,
      };
    }

    const existingUser = await sql`
      SELECT email FROM users WHERE email = ${email}
    `;

    if (existingUser.rows.length > 0) {
      return {
        message: 'User with this email already exists',
        success: false,
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await sql`
      INSERT INTO users (name, email, password, phone_number)
      VALUES (${name}, ${email}, ${hashedPassword}, ${phoneNumber})
    `;

    revalidatePath('/login');
    
    return {
      message: 'Registration successful',
      success: true,
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      message: 'Something went wrong during registration',
      success: false,
    };
  }
}