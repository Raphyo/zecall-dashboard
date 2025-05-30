import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { OAuth2Client } from 'google-auth-library';

// Create OAuth2 client
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXTAUTH_URL + '/api/gmail/auth/callback'
);

// Gmail API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'You must be signed in to access this endpoint' },
        { status: 401 }
      );
    }

    // Generate authentication URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: SCOPES,
      prompt: 'consent', // Force consent screen
      include_granted_scopes: true,
      // Pass user's email as state to identify the user in the callback
      state: Buffer.from(JSON.stringify({ email: session.user.email })).toString('base64'),
    });

    // Return authentication URL
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error generating authentication URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication URL' },
      { status: 500 }
    );
  }
} 