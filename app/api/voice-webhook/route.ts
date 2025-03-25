import { NextResponse } from 'next/server';
import { ORCHESTRATOR_URL } from '@/app/lib/api';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const searchParams = new URL(request.url).searchParams;

    // Validate orchestrator URL
    if (!ORCHESTRATOR_URL) {
      throw new Error('ORCHESTRATOR_URL is not configured');
    }

    console.log('🔵 Forwarding request to orchestrator:', `${ORCHESTRATOR_URL}/voice-webhook?${searchParams}`);

    // Forward the request to the backend
    const response = await fetch(`${ORCHESTRATOR_URL}/voice-webhook?${searchParams}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Orchestrator error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      return NextResponse.json(
        { error: errorText || 'Failed to process request' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error in voice webhook:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
} 