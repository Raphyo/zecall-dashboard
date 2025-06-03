import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { sql } from '@vercel/postgres';

// Ensure environment variables are loaded correctly
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Log the environment variables for debugging
console.log('Environment variables in callback route:');
console.log('- NEXTAUTH_URL:', NEXTAUTH_URL);
console.log('- GOOGLE_CLIENT_ID present:', !!GOOGLE_CLIENT_ID);
console.log('- GOOGLE_CLIENT_SECRET present:', !!GOOGLE_CLIENT_SECRET);

// Create OAuth2 client
const redirectUri = `${NEXTAUTH_URL}/api/gmail/auth/callback`;
const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  redirectUri
);

// Log the configured redirect URI
console.log('Callback configured redirect URI:', redirectUri);

export async function GET(request: NextRequest) {
  try {
    // Get authorization code from query parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Log the full request URL and search params for debugging
    console.log('Callback request URL:', request.url);
    console.log('Callback search params:', {
      code: code ? 'present' : 'missing',
      state: state ? 'present' : 'missing',
      error
    });

    // Handle error from Google
    if (error) {
      console.error('Error from Google OAuth:', error);
      return NextResponse.redirect(new URL('/dashboard/emails?error=auth_denied', request.url));
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('Missing required parameters:', { code, state });
      return NextResponse.redirect(new URL('/dashboard/emails?error=invalid_request', request.url));
    }

    // Decode state parameter to get user email
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
      const userEmail = decodedState.email;
      const userId = decodedState.user_id;
      const timestamp = decodedState.timestamp;

      console.log('State decoded successfully:', { 
        decodedState, 
        userEmail, 
        userId,
        timestamp,
        decodedAt: new Date().toISOString()
      });

      if (!userEmail) {
        throw new Error('User email not found in state');
      }

      // Exchange authorization code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      
      console.log('Received tokens for user:', userEmail);
      
      // Store tokens in your database
      await storeGmailTokens(userEmail, tokens, userId);

      // Redirect back to emails page
      return NextResponse.redirect(new URL('/dashboard/emails?success=true', request.url));
    } catch (decodeError) {
      console.error('Error decoding state or getting tokens:', decodeError);
      return NextResponse.redirect(new URL('/dashboard/emails?error=token_exchange', request.url));
    }
  } catch (error) {
    console.error('Error in Gmail auth callback:', error);
    return NextResponse.redirect(new URL('/dashboard/emails?error=server_error', request.url));
  }
}

// Helper function to store Gmail tokens
async function storeGmailTokens(email: string, tokens: any, userId?: string) {
  try {
    // In a real application, you would use your database client
    // Example with Vercel Postgres:
    const { access_token, refresh_token, expiry_date } = tokens;
    
    // Use a default user_id if none provided
    const user_id = userId || 'unknown';
    
    console.log('Storing tokens for:', { email, user_id });
    
    // Check if tokens already exist for this user
    const existingTokens = await sql`
      SELECT * FROM gmail_tokens 
      WHERE user_email = ${email} AND (user_id = ${user_id} OR user_id IS NULL)
    `;

    if (existingTokens.rowCount && existingTokens.rowCount > 0) {
      // Update existing tokens
      await sql`
        UPDATE gmail_tokens
        SET 
          access_token = ${access_token},
          refresh_token = ${refresh_token || existingTokens.rows[0].refresh_token},
          expiry_date = ${expiry_date || null},
          user_id = ${user_id},
          updated_at = NOW()
        WHERE id = ${existingTokens.rows[0].id}
      `;
    } else {
      // Insert new tokens
      await sql`
        INSERT INTO gmail_tokens (user_email, user_id, access_token, refresh_token, expiry_date, created_at, updated_at)
        VALUES (
          ${email},
          ${user_id},
          ${access_token},
          ${refresh_token || null},
          ${expiry_date || null},
          NOW(),
          NOW()
        )
      `;
    }

    console.log('Gmail tokens stored successfully for user:', email);
  } catch (error) {
    console.error('Error storing Gmail tokens:', error);
    throw error;
  }
} 