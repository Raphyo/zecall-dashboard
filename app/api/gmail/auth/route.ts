import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { OAuth2Client } from 'google-auth-library';

// Ensure environment variables are loaded correctly
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Log the environment variables for debugging
console.log('Environment variables in auth route:');
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

// Log the redirect URI for debugging
console.log('Configured redirect URI:', redirectUri);

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

    console.log('Generating auth URL for user:', session.user.email, 'ID:', session.user.id);

    // Generate authentication URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: SCOPES,
      prompt: 'consent', // Force consent screen
      include_granted_scopes: true,
      // Pass user's email and ID as state to identify the user in the callback
      state: Buffer.from(JSON.stringify({ 
        email: session.user.email, 
        user_id: session.user.id,
        timestamp: Date.now() // Add timestamp to prevent caching issues
      })).toString('base64'),
    });

    // Log the full auth URL for debugging
    console.log('Generated auth URL:', authUrl);

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