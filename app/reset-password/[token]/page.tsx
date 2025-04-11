import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import UpdatePasswordForm from '@/app/ui/reset-password/update-password-form';

export default async function ResetPasswordPage({
  params
}: {
  params: { token: string }
}) {
  // Check if token exists and is valid
  const result = await sql`
    SELECT user_id, expires_at, used_at
    FROM password_reset_tokens
    WHERE token = ${params.token}
  `;

  if (result.rows.length === 0) {
    redirect('/login?error=invalid_token');
  }

  const token = result.rows[0];
  
  if (token.used_at) {
    redirect('/login?error=token_used');
  }

  if (new Date(token.expires_at) < new Date()) {
    redirect('/login?error=token_expired');
  }

  return <UpdatePasswordForm token={params.token} userId={token.user_id} />;
} 