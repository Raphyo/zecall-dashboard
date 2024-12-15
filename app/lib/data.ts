import { sql } from "@vercel/postgres";
import { IncomingCallsTable } from "./definitions";
import { auth } from "@/auth";
import { unstable_noStore as noStore } from 'next/cache';

const ITEMS_PER_PAGE = 10;

export async function fetchFilteredIncomingCalls(
  query: string,
  currentPage: number
) {
  noStore();
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
      // Ensure we await the auth call
    const session = await auth();
    
    if (!session?.user?.email) {
      console.log('No valid session found');
      return { calls: [], totalPages: 0 };
    }

    // Get user details from database using email
    const userResult = await sql`
      SELECT * FROM users WHERE email = ${session.user.email}
    `;

    if (!userResult.rows.length) {
      console.log('No user found');
      return { calls: [], totalPages: 0 };
    }

    const userId = userResult.rows[0].id;

    // Get total count for pagination
    const countResult = await sql`
      SELECT COUNT(*) 
      FROM incoming_calls 
      WHERE user_id = ${userId}
    `;

    const totalPages = Math.ceil(Number(countResult.rows[0].count) / ITEMS_PER_PAGE);

    const calls = await sql<IncomingCallsTable>`
      SELECT
        id,
        caller_number,
        callee_number,
        caller_name,
        call_category,
        date,
        duration,
        hour,
        recording_url,
        ai_transcript,
        call_status
      FROM incoming_calls
      WHERE
        user_id = ${userId}
        AND (
          caller_name ILIKE ${`%${query}%`} OR
          caller_number ILIKE ${`%${query}%`} OR
          call_category ILIKE ${`%${query}%`}
        )
      ORDER BY date DESC, hour DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;
    return { calls: calls.rows, totalPages };
  } catch (error) {
    console.error('Database Error:', error);
    return { calls: [], totalPages: 0 };
  }
}

export async function fetchCampaigns() {
  noStore();
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return [];
    }

    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;

    if (!userResult.rows.length) {
      return [];
    }

    const userId = userResult.rows[0].id;

    const campaigns = await sql`
      SELECT * FROM campaigns 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    return campaigns.rows;
  } catch (error) {
    console.error('Database Error:', error);
    return [];
  }
}

export async function fetchCampaignDetails(campaignId: string) {
  noStore();
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return null;
    }

    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `;

    if (!userResult.rows.length) {
      return null;
    }

    const userId = userResult.rows[0].id;

    const campaignResult = await sql`
      SELECT c.*, array_agg(
        json_build_object(
          'id', cc.id,
          'name', cc.name,
          'phone_number', cc.phone_number,
          'status', cc.status,
          'called_at', cc.called_at
        )
      ) as contacts
      FROM campaigns c
      LEFT JOIN campaign_contacts cc ON c.id = cc.campaign_id
      WHERE c.id = ${campaignId}
      AND c.user_id = ${userId}
      GROUP BY c.id
    `;

    if (!campaignResult.rows.length) {
      return null;
    }

    return campaignResult.rows[0];
  } catch (error) {
    console.error('Database Error:', error);
    return null;
  }
}