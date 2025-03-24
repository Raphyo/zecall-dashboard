import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const searchParams = new URL(request.url).searchParams;

    // Forward the request to the backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_ORCHESTRATOR_SERVICE_URL}/voice-webhook?${searchParams}`, {
      method: 'POST',
      body: formData
    });

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