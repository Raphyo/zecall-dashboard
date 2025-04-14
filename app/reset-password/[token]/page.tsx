import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import UpdatePasswordForm from '@/app/ui/reset-password/update-password-form';

interface Props {
  params: Promise<{
    token: string;
  }>;
}

export default async function ResetPasswordPage({
  params,
}: Props) {
  // Check if token exists and is valid
  const result = await sql`
    SELECT user_id::text, expires_at, used_at
    FROM password_reset_tokens
    WHERE token = ${(await params).token}
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

  return <UpdatePasswordForm token={(await params).token} userId={token.user_id} />;
} 