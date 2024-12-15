'use server';

import { auth, signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcrypt';


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

type Contact = {
  name: string;
  phone_number: string;
};

export async function createCampaign({
  name,
  contacts,
}: {
  name: string;
  contacts: Contact[];
}) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      throw new Error('Not authenticated');
    }

    // Get user ID
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;
    const userId = userResult.rows[0].id;

    // Create campaign
    const campaignResult = await sql`
      INSERT INTO campaigns (user_id, name, status)
      VALUES (${userId}, ${name}, 'created')
      RETURNING id
    `;
    const campaignId = campaignResult.rows[0].id;

    // Insert contacts
    for (const contact of contacts) {
      await sql`
        INSERT INTO campaign_contacts (campaign_id, name, phone_number)
        VALUES (${campaignId}, ${contact.name}, ${contact.phone_number})
      `;
    }

    revalidatePath('/dashboard/campaigns');
    return { success: true };
  } catch (error) {
    console.error('Failed to create campaign:', error);
    throw new Error('Failed to create campaign');
  }
}

function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // Add the + prefix if not present
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

export async function startCampaign(formData: FormData) {
  const campaignId = formData.get('campaignId') as string;

  try {
    const session = await auth();
    if (!session?.user?.email) {
      throw new Error('Not authenticated');
    }

    // Update campaign status
    await sql`
      UPDATE campaigns
      SET status = 'in_progress', started_at = CURRENT_TIMESTAMP
      WHERE id = ${campaignId}
    `;

    // Get campaign contacts
    const contactsResult = await sql`
      SELECT phone_number, name
      FROM campaign_contacts
      WHERE campaign_id = ${campaignId}
      AND status = 'pending'
    `;

    // Format contacts for API call
    const contacts = contactsResult.rows.map(contact => [
      formatPhoneNumber(contact.phone_number),
      contact.name
    ]);
    const apiPayload = {
      phone_numbers_and_names: contacts,
      from_number: process.env.FROM_NUMBER,
      delay_between_calls: 300  // Add a default delay in seconds
    };

    // Make API call to start calls
    const response = await fetch('https://fa83-147-236-191-253.ngrok-free.app/batch-outbound-calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload),
    });

    if (!response.ok) {
      // If API call fails, update campaign status to failed
      await sql`
        UPDATE campaigns
        SET status = 'failed', 
            error_message = ${response.statusText || 'API call failed'}
        WHERE id = ${campaignId}
      `;
      throw new Error('Failed to start calls');
    }

    revalidatePath(`/dashboard/campaigns/${campaignId}`);
    return { success: true };
  } catch (error) {
    await sql`
      UPDATE campaigns
      SET status = 'failed',
          error_message = ${error instanceof Error ? error.message : 'Unknown error'}
      WHERE id = ${campaignId}
    `;

    console.error('Failed to start campaign:', error);
    throw new Error('Failed to start campaign');
  }
}


export async function deleteCampaign(campaignId: string) {
  try {
    // First, check if the campaign exists
    const campaign = await sql`
      SELECT id FROM campaigns WHERE id = ${campaignId}
    `;

    if (!campaign.rows.length) {
      throw new Error('Campaign not found');
    }

    // Begin a transaction to ensure both deletions succeed or fail together
    await sql`BEGIN`;
    try {
      // Delete campaign contacts first (due to foreign key constraint)
      await sql`
        DELETE FROM campaign_contacts WHERE campaign_id = ${campaignId}
      `;

      // Then delete the campaign
      await sql`
        DELETE FROM campaigns WHERE id = ${campaignId}
      `;

      await sql`COMMIT`;
      revalidatePath('/dashboard/campaigns');
      return { success: true };
    } catch (err: unknown) {
      await sql`ROLLBACK`;
      console.error('Database error during campaign deletion:', err);
      if (err instanceof Error) {
        throw new Error(`Database error: ${err.message}`);
      }
      throw new Error('Database error during campaign deletion');
    }
  } catch (err: unknown) {
    console.error('Failed to delete campaign:', err);
    if (err instanceof Error) {
      throw new Error(err.message);
    }
    throw new Error('Failed to delete campaign');
  }
}

