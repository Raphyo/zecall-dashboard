import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ANALYTICS_URL } from '@/app/lib/api';
import { CALL_COST_PER_MINUTE } from '@/app/lib/constants';

export async function GET(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get duration from query params
    const { searchParams } = new URL(request.url);
    const durationMinutes = Number(searchParams.get('duration_minutes') || '0');

    if (!durationMinutes || durationMinutes <= 0) {
      return NextResponse.json(
        { error: 'Invalid duration' },
        { status: 400 }
      );
    }

    // Calculate estimated cost
    const estimatedCost = durationMinutes * CALL_COST_PER_MINUTE;

    // Get current balance
    const response = await fetch(`${ANALYTICS_URL}/api/credits?user_id=${session.user.id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch credits');
    }

    const currentBalance = data.credits;
    const hasSufficientCredits = currentBalance >= estimatedCost;

    return NextResponse.json({
      has_sufficient_credits: hasSufficientCredits,
      current_balance: currentBalance,
      estimated_cost: estimatedCost,
      duration_minutes: durationMinutes
    });
  } catch (error) {
    console.error('Failed to check credits:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check credits' },
      { status: 500 }
    );
  }
} 