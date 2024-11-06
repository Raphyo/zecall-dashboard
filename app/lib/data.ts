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
    // Use a try-catch block specifically for auth
    let session;
    try {
      session = await auth();
    } catch (authError) {
      console.error('Auth Error:', authError);
      return [];
    }
    
    if (!session?.user?.email) {
      console.log('No valid session found');
      return [];
    }

    // Get user details from database using email
    const userResult = await sql`
      SELECT * FROM users WHERE email = ${session.user.email}
    `;

    if (!userResult.rows.length) {
      console.log('No user found');
      return [];
    }

    const userId = userResult.rows[0].id;

    const calls = await sql<IncomingCallsTable>`
      SELECT
        id,
        caller_number,
        caller_name,
        call_category,
        date,
        duration,
        hour,
        recording_url
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

    return calls.rows;
  } catch (error) {
    console.error('Database Error:', error);
    return [];
  }
}