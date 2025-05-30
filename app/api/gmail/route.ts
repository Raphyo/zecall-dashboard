import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { sql } from '@vercel/postgres';

// Create a new OAuth2 client
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXTAUTH_URL + '/api/auth/callback/google'
);

// Helper function to safely parse and format dates
function safeFormatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      // Return a fallback date if invalid
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch (error) {
    console.warn('Error parsing date:', dateString, error);
    // Return current date as fallback
    return new Date().toISOString();
  }
}

// This is a placeholder for actual Gmail API integration
// In a real implementation, you would use the Google API client library
// and authenticate with OAuth2 to fetch emails

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: 'You must be signed in to access emails' },
        { status: 401 }
      );
    }

    // Check if we have token information in the session
    const userEmail = session.user?.email;
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found in session' },
        { status: 400 }
      );
    }

    // Get URL parameters for pagination and search
    const searchParams = request.nextUrl.searchParams;
    const pageToken = searchParams.get('pageToken') || '';
    const maxResults = Number(searchParams.get('maxResults') || '25'); // Default to 25 emails per page
    const searchQuery = searchParams.get('q') || '';

    // Get user's Google token from database
    // This assumes you're storing tokens when the user signs in with Google
    const tokens = await getGoogleTokensForUser(userEmail);
    
    if (!tokens || !tokens.access_token) {
      return NextResponse.json(
        { error: 'Gmail access not authorized', needsAuth: true },
        { status: 401 }
      );
    }

    // Set credentials and create Gmail service
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Build the Gmail query
    let gmailQuery = 'in:inbox';
    if (searchQuery) {
      // Add search term to the Gmail query
      gmailQuery += ` ${searchQuery}`;
    }

    // Get messages from Gmail inbox with pagination support
    const messageResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: maxResults,
      pageToken: pageToken || undefined,
      q: gmailQuery, // Query to filter messages
    });

    const messageList = messageResponse.data.messages || [];
    const emails = [];

    // Get detailed information for each message
    for (const message of messageList) {
      if (message.id) {
        const messageData = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });

        // Extract headers
        const headers = messageData.data.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        
        // Determine if message is unread
        const isUnread = messageData.data.labelIds?.includes('UNREAD') || false;
        
        // Extract snippet
        const snippet = messageData.data.snippet || '';

        emails.push({
          id: message.id,
          subject,
          sender: from,
          snippet,
          date: safeFormatDate(date),
          unread: isUnread,
        });
      }
    }

    // Return emails along with pagination info
    return NextResponse.json({
      emails,
      nextPageToken: messageResponse.data.nextPageToken || null,
      resultSizeEstimate: messageResponse.data.resultSizeEstimate || 0,
      searchQuery: searchQuery // Return the search query for reference
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}

// Helper function to get Google tokens for user
async function getGoogleTokensForUser(email: string) {
  try {
    // Retrieve tokens from the database
    const tokensResult = await sql`
      SELECT access_token, refresh_token, expiry_date
      FROM gmail_tokens
      WHERE user_email = ${email}
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    if (!tokensResult.rowCount || tokensResult.rowCount === 0) {
      console.log('No Gmail tokens found for user:', email);
      return null;
    }

    const tokenData = tokensResult.rows[0];
    
    // Check if token is expired and needs refresh
    const now = Date.now();
    const expiryDate = tokenData.expiry_date ? Number(tokenData.expiry_date) : 0;
    
    if (expiryDate && expiryDate < now) {
      // Token is expired, refresh it
      console.log('Gmail token expired, refreshing...');
      
      if (!tokenData.refresh_token) {
        console.error('No refresh token available for user:', email);
        return null;
      }
      
      // Set the refresh token and refresh
      oauth2Client.setCredentials({
        refresh_token: tokenData.refresh_token
      });
      
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        // Update the tokens in the database
        await sql`
          UPDATE gmail_tokens
          SET 
            access_token = ${credentials.access_token},
            expiry_date = ${credentials.expiry_date || null},
            updated_at = NOW()
          WHERE user_email = ${email}
        `;
        
        return credentials;
      } catch (refreshError) {
        console.error('Error refreshing Gmail token:', refreshError);
        return null;
      }
    }
    
    // Return the token data
    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expiry_date
    };
  } catch (error) {
    console.error('Error getting Google tokens:', error);
    return null;
  }
} 