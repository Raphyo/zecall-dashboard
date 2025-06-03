import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { sql } from '@vercel/postgres';

interface RequestParams {
  params: {
    messageId: string;
  }
}

// Create a new OAuth2 client
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXTAUTH_URL + '/api/auth/callback/google'
);

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

// Function to extract email parts
function parseEmailParts(payload: any) {
  const parts: any[] = [];
  
  function extractParts(part: any) {
    if (!part) return;
    
    if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
      parts.push({
        mimeType: part.mimeType,
        body: part.body?.data || '',
      });
    } else if (part.parts && part.parts.length > 0) {
      part.parts.forEach((subpart: any) => extractParts(subpart));
    }
  }
  
  if (payload.mimeType === 'text/plain' || payload.mimeType === 'text/html') {
    parts.push({
      mimeType: payload.mimeType,
      body: payload.body?.data || '',
    });
  }
  
  if (payload.parts) {
    payload.parts.forEach((part: any) => extractParts(part));
  }
  
  return parts;
}

// Get a single email by ID
export async function GET(
  request: NextRequest
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: 'You must be signed in to access emails' },
        { status: 401 }
      );
    }

    const userEmail = session.user?.email;
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found in session' },
        { status: 400 }
      );
    }

    // Extract messageId from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const messageId = pathParts[pathParts.length - 1];

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    // Get user's Google token from database
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

    // Get the email details
    const messageData = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    // Get thread ID to get all messages in the conversation
    const threadId = messageData.data.threadId;
    let threadMessages: any[] = [];
    
    if (threadId) {
      const threadData = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
      });
      
      threadMessages = threadData.data.messages || [];
    }

    // Mark as read if it's unread
    if (messageData.data.labelIds?.includes('UNREAD')) {
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });
    }

    // Extract headers
    const headers = messageData.data.payload?.headers || [];
    const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
    const from = headers.find(h => h.name === 'From')?.value || '';
    const to = headers.find(h => h.name === 'To')?.value || '';
    const cc = headers.find(h => h.name === 'Cc')?.value || '';
    const bcc = headers.find(h => h.name === 'Bcc')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || '';
    const messageIdHeader = headers.find(h => h.name === 'Message-ID')?.value || '';
    const inReplyTo = headers.find(h => h.name === 'In-Reply-To')?.value || '';
    
    // Extract body parts
    const parts = parseEmailParts(messageData.data.payload);
    
    // Convert base64 encoded content
    const decodedParts = parts.map(part => {
      if (part.body) {
        // Replace - with + and _ with / to handle URL-safe base64
        const base64 = part.body.replace(/-/g, '+').replace(/_/g, '/');
        try {
          const decoded = Buffer.from(base64, 'base64').toString('utf-8');
          return {
            ...part,
            content: decoded
          };
        } catch (e) {
          console.error('Error decoding email part:', e);
          return {
            ...part,
            content: 'Could not decode content'
          };
        }
      }
      return part;
    });

    // Extract attachments if any
    const attachments: Array<{
      id: string | undefined;
      filename: string;
      mimeType: string;
      size: number;
    }> = [];
    
    if (messageData.data.payload?.parts) {
      messageData.data.payload.parts.forEach((part: any) => {
        if (part.filename && part.filename.length > 0) {
          attachments.push({
            id: part.body?.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body?.size || 0
          });
        }
      });
    }

    // Format thread data
    const thread = threadMessages.map((msg: any) => {
      const msgHeaders = msg.payload?.headers || [];
      const msgSubject = msgHeaders.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
      const msgFrom = msgHeaders.find((h: any) => h.name === 'From')?.value || '';
      const msgDate = msgHeaders.find((h: any) => h.name === 'Date')?.value || '';
      const msgParts = parseEmailParts(msg.payload);
      
      // Convert base64 encoded content for thread messages
      const msgDecodedParts = msgParts.map(part => {
        if (part.body) {
          const base64 = part.body.replace(/-/g, '+').replace(/_/g, '/');
          try {
            const decoded = Buffer.from(base64, 'base64').toString('utf-8');
            return {
              ...part,
              content: decoded
            };
          } catch (e) {
            console.error('Error decoding thread message part:', e);
            return {
              ...part,
              content: 'Could not decode content'
            };
          }
        }
        return part;
      });
      
      return {
        id: msg.id,
        threadId: msg.threadId,
        subject: msgSubject,
        from: msgFrom,
        date: new Date(msgDate).toISOString(),
        snippet: msg.snippet || '',
        parts: msgDecodedParts,
        isRead: !msg.labelIds?.includes('UNREAD'),
      };
    });

    return NextResponse.json({
      id: messageId,
      threadId,
      subject,
      from,
      to,
      cc,
      bcc,
      date: new Date(date).toISOString(),
      messageId: messageIdHeader,
      inReplyTo,
      parts: decodedParts,
      attachments,
      thread,
    });
  } catch (error) {
    console.error('Error fetching email:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email' },
      { status: 500 }
    );
  }
} 