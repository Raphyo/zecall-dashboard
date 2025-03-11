import { NextResponse } from 'next/server';
import { creditUpdateEvent, CREDIT_UPDATE_EVENT } from '@/app/ui/dashboard/sidenav';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export async function POST(request: Request) {
  try {
    // 1. Security check (if you want to add it)
    const authHeader = request.headers.get('authorization');
    if (WEBHOOK_SECRET && authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      console.error('Unauthorized webhook call attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse the webhook data that matches your Python backend
    const {
      callId,
      userId,
      duration,
      billedMinutes,
      remainingCredits,
      status
    } = await request.json();

    // 3. Validate the data
    if (!callId || !userId || remainingCredits === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 4. Dispatch event with all relevant information
    creditUpdateEvent.dispatchEvent(
      new CustomEvent(CREDIT_UPDATE_EVENT, {
        detail: {
          callId,
          userId,
          duration,
          billedMinutes,
          remainingCredits,
          status
        }
      })
    );

    console.log(`Credit update event dispatched for call ${callId}:`, {
      billedMinutes,
      remainingCredits
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
} 