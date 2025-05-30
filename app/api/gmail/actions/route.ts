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

// Function to create a base64 encoded email with attachments
function createEmailWithAttachments(params: {
  to: string;
  from: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  replyToMessageId?: string;
  threadId?: string;
  isHtml?: boolean;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    mimeType: string;
  }>;
}) {
  const { to, from, cc, bcc, subject, body, replyToMessageId, isHtml, attachments } = params;
  
  // Generate a boundary for multipart messages
  const boundary = `boundary_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create email headers
  let emailLines = [
    `From: ${from}`,
    `To: ${to}`,
  ];
  
  if (cc) emailLines.push(`Cc: ${cc}`);
  if (bcc) emailLines.push(`Bcc: ${bcc}`);
  if (replyToMessageId) emailLines.push(`In-Reply-To: ${replyToMessageId}`);
  
  // Add basic headers
  emailLines.push(`Subject: ${subject}`);
  
  // If we have attachments, make it a multipart message
  if (attachments && attachments.length > 0) {
    emailLines.push(
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8`,
      'Content-Transfer-Encoding: 7bit',
      '',
      body.trim(),
      ''
    );
    
    // Add attachments
    for (const attachment of attachments) {
      emailLines.push(
        `--${boundary}`,
        `Content-Type: ${attachment.mimeType}`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        '',
        attachment.content.toString('base64').replace(/(.{76})/g, '$1\r\n'),
        ''
      );
    }
    
    // End the multipart message
    emailLines.push(`--${boundary}--`);
  } else {
    // Simple email without attachments
    emailLines.push(
      'MIME-Version: 1.0',
      `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8`,
      'Content-Transfer-Encoding: 7bit',
      '',
      body.trim()
    );
  }
  
  const email = emailLines.join('\r\n');
  return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: 'You must be signed in to perform this action' },
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

    // Check if the request is a FormData request (with attachments)
    const contentType = request.headers.get('content-type') || '';
    let action, messageId, threadId, to, cc, bcc, subject, content, isHtml;
    let attachments: Array<{filename: string; content: Buffer; mimeType: string}> = [];
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData with attachments
      const formData = await request.formData();
      
      action = formData.get('action') as string;
      messageId = formData.get('messageId') as string;
      threadId = formData.get('threadId') as string;
      to = formData.get('to') as string;
      cc = formData.get('cc') as string;
      bcc = formData.get('bcc') as string;
      subject = formData.get('subject') as string;
      content = formData.get('content') as string;
      isHtml = formData.get('isHtml') === 'true';
      
      // Extract file attachments
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('attachment-') && value instanceof File) {
          const file = value;
          const buffer = Buffer.from(await file.arrayBuffer());
          
          attachments.push({
            filename: file.name,
            content: buffer,
            mimeType: file.type || 'application/octet-stream'
          });
        }
      }
    } else {
      // Handle regular JSON request without attachments
      const body = await request.json();
      action = body.action;
      messageId = body.messageId;
      threadId = body.threadId;
      to = body.to;
      cc = body.cc;
      bcc = body.bcc;
      subject = body.subject;
      content = body.content;
      isHtml = body.isHtml;
    }

    if (!action || !to || !subject || !content) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
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

    // Prepare the base parameters for the email
    const emailParams = {
      to,
      from: userEmail,
      cc,
      bcc,
      subject,
      body: content,
      isHtml: isHtml || false,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    // Handle different actions
    switch (action) {
      case 'reply':
      case 'replyAll': {
        if (!messageId) {
          return NextResponse.json(
            { error: 'Message ID is required for reply actions' },
            { status: 400 }
          );
        }
        
        // Get original message details to get the message ID header
        const originalMessage = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'metadata',
          metadataHeaders: ['Message-ID', 'Subject', 'References'],
        });
        
        const headers = originalMessage.data.payload?.headers || [];
        const originalMessageId = headers.find(h => h.name === 'Message-ID')?.value || '';
        
        // Create reply email with attachments
        const raw = createEmailWithAttachments({
          ...emailParams,
          replyToMessageId: originalMessageId,
          threadId,
        });
        
        // Send the email
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw,
            threadId,
          },
        });
        
        return NextResponse.json({ success: true, action });
      }
      
      case 'forward': {
        if (!messageId) {
          return NextResponse.json(
            { error: 'Message ID is required for forward action' },
            { status: 400 }
          );
        }
        
        // Create forwarded email with attachments
        const raw = createEmailWithAttachments(emailParams);
        
        // Send the email
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw,
          },
        });
        
        return NextResponse.json({ success: true, action });
      }
      
      case 'compose': {
        // Create new email with attachments
        const raw = createEmailWithAttachments(emailParams);
        
        // Send the email
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw,
          },
        });
        
        return NextResponse.json({ success: true, action });
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error performing email action:', error);
    return NextResponse.json(
      { error: 'Failed to perform email action' },
      { status: 500 }
    );
  }
} 