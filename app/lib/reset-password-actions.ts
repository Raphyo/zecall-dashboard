'use server';

import { sql } from '@vercel/postgres';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export type ResetPasswordState = {
  message?: string;
  success?: boolean;
};

const emailSchema = z.string().email({
  message: "L'adresse email n'est pas valide",
});

const passwordSchema = z.object({
  password: z.string().min(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

export async function resetPassword(
  prevState: ResetPasswordState | undefined,
  formData: FormData
): Promise<ResetPasswordState> {
  console.log('=== Reset Password Action Started ===');
  console.log('Previous state:', prevState);
  console.log('Form data keys:', Array.from(formData.keys()));
  
  const email = formData.get('email') as string;
  console.log('Email from form:', email);

  try {
    console.log('Starting password reset process for email:', email);
    
    // Development mode check
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Validate email
    const validatedEmail = emailSchema.parse(email);
    console.log('Email validation passed');

    // Check if user exists
    const user = await sql`
      SELECT id, email FROM users WHERE email = ${validatedEmail}
    `;
    console.log('Database query result:', { rowCount: user.rows.length });

    if (user.rows.length === 0) {
      console.log('No user found with this email');
      return {
        message: "Aucun compte n'est associé à cette adresse email",
        success: false
      };
    }

    // Generate reset token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    console.log('Generated reset token and expiration:', { 
      tokenLength: token.length,
      expiresAt: expiresAt.toISOString()
    });

    // Store token in database
    await sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.rows[0].id}, ${token}, ${expiresAt.toISOString()})
    `;
    console.log('Token stored in database');

    // Generate reset link
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${token}`;
    console.log('Reset link generated:', resetLink);
    console.log('Environment variables:', {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      RESEND_API_KEY_LENGTH: process.env.RESEND_API_KEY?.length || 0
    });

    // Send email using Resend
    console.log('Attempting to send email with Resend...');
    try {
      // In development, we can only send to the verified email
      const toEmail = validatedEmail;
      
      const emailResult = await resend.emails.send({
        from:'Zecall <noreply@zecall.ai>',
        to: toEmail,
        subject: 'Réinitialisation de votre mot de passe',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a; margin-bottom: 24px;">Réinitialisation de votre mot de passe</h2>
            
            <p style="color: #4b5563; margin-bottom: 16px;">
              Vous avez demandé la réinitialisation de votre mot de passe sur Zecall.
            </p>
            
            <p style="color: #4b5563; margin-bottom: 24px;">
              Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :
            </p>
            
            <a href="${resetLink}"
               style="display: inline-block; background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500;">
              Réinitialiser mon mot de passe
            </a>
            
            <p style="color: #6b7280; margin-top: 24px; font-size: 14px;">
              Ce lien expirera dans 24 heures.
            </p>
            
            <p style="color: #6b7280; margin-top: 16px; font-size: 14px;">
              Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.
            </p>
            
            <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px;">
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
              </p>
            </div>
          </div>
        `
      });
      console.log('Email sent successfully:', emailResult);
    } catch (emailError: any) {
      console.error('Error sending email:', {
        error: emailError,
        errorMessage: emailError?.message || 'Unknown error',
        errorName: emailError?.name || 'Unknown',
        errorStack: emailError?.stack || 'No stack trace'
      });
      throw emailError;
    }
    
    return {
      message: 'Email envoyé avec succès. Vérifiez votre boîte de réception.',
      success: true
    };
  } catch (error: any) {
    console.error('Password reset error:', {
      error,
      errorMessage: error?.message || 'Unknown error',
      errorName: error?.name || 'Unknown',
      errorStack: error?.stack || 'No stack trace'
    });
    
    if (error instanceof z.ZodError) {
      return {
        message: error.errors[0].message,
        success: false
      };
    }

    return {
      message: "Une erreur s'est produite lors de l'envoi de l'email",
      success: false
    };
  }
}

export async function updatePassword(
  prevState: ResetPasswordState | undefined,
  formData: FormData
): Promise<ResetPasswordState> {
  try {
    const token = formData.get('token') as string;
    const userId = formData.get('userId') as string; // UUID is a string
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // Validate passwords
    const validatedData = passwordSchema.parse({ password, confirmPassword });

    // Check if token is valid and not used
    const tokenResult = await sql`
      SELECT id
      FROM password_reset_tokens
      WHERE token = ${token}
        AND user_id = ${userId}::uuid
        AND used_at IS NULL
        AND expires_at > NOW()
    `;

    if (tokenResult.rows.length === 0) {
      return {
        message: 'Le lien de réinitialisation est invalide ou a expiré',
        success: false
      };
    }

    // Hash the new password
    const hashedPassword = await hash(validatedData.password, 10);

    // Update password
    await sql`
      UPDATE users
      SET password = ${hashedPassword}
      WHERE id = ${userId}::uuid
    `;

    // Mark token as used
    await sql`
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE token = ${token}
    `;

    return {
      message: 'Votre mot de passe a été mis à jour avec succès',
      success: true
    };
  } catch (error) {
    console.error('Update password error:', error);

    if (error instanceof z.ZodError) {
      return {
        message: error.errors[0].message,
        success: false
      };
    }

    return {
      message: "Une erreur s'est produite lors de la mise à jour du mot de passe",
      success: false
    };
  }
} 