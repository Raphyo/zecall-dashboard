import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ANALYTICS_URL, ORCHESTRATOR_URL } from '@/app/lib/api';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate backend URL
    if (!ANALYTICS_URL) {
      throw new Error('BACKEND_API_URL is not configured');
    }

    // Make request to backend API
    console.log('🔵 Fetching credits from:', `${ANALYTICS_URL}/api/credits?user_id=${session.user.id}`);
    const response = await fetch(`${ANALYTICS_URL}/api/credits?user_id=${session.user.id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch credits');
    }

    return NextResponse.json({ credits: data.credits });
  } catch (error) {
    console.error('Failed to fetch credits:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch credits' },
      { status: 500 }
    );
  }
}

// Add endpoint to get transaction history
export async function POST() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate backend URL
    if (!ANALYTICS_URL) {
      throw new Error('BACKEND_API_URL is not configured');
    }

    // Make request to backend API
    console.log('🔵 Fetching transactions from:', `${ANALYTICS_URL}/api/credits/transactions?user_id=${session.user.id}`);
    const response = await fetch(`${ANALYTICS_URL}/api/credits/transactions?user_id=${session.user.id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch transactions');
    }

    return NextResponse.json({ transactions: data.transactions });
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
} 