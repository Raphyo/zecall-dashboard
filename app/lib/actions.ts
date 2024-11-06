'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcrypt';
import { v5 as uuidv5 } from 'uuid';


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

    // Create credentials object from form data
    const credentials = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    await signIn('credentials', {
      ...credentials,
      redirect: true,
      redirectTo: '/dashboard',
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

    console.log('Input Values:', { name, email, password, phoneNumber });

    // Validate input
    if (!name || !email || !password || !phoneNumber) {
      return {
        message: 'Missing required fields',
        success: false,
      };
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT email FROM users WHERE email = ${email}
    `;

    if (existingUser.rows.length > 0) {
      return {
        message: 'User with this email already exists',
        success: false,
      };
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate UUID based on phone number
    const phoneNumberCleaned = phoneNumber.replace(/[^0-9]/g, '');

    // Insert the new user
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