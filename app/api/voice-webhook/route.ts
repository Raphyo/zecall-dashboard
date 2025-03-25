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

    const targetUrl = `${ORCHESTRATOR_URL}/voice-webhook?${searchParams}`;
    console.log('🔵 Forwarding request to orchestrator:', {
      url: targetUrl,
      formData: Object.fromEntries(formData.entries()),
      searchParams: Object.fromEntries(searchParams.entries())
    });

    // Forward the request to the backend
    const response = await fetch(targetUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    });

    // Get response content
    const responseText = await response.text();
    console.log('🔵 Orchestrator detailed response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText
    });

    if (!response.ok) {
      // Try to parse as JSON first
      try {
        const errorData = JSON.parse(responseText);
        return NextResponse.json(
          { error: errorData.error || 'Failed to process request' },
          { status: response.status }
        );
      } catch {
        // If not JSON, return the raw error
        return NextResponse.json(
          { error: `Orchestrator error: ${responseText.substring(0, 200)}...` },
          { status: response.status }
        );
      }
    }

    // For successful responses, if the response is empty or whitespace, return a success message
    if (!responseText.trim()) {
      return NextResponse.json({ 
        status: 'success',
        message: 'Call initiated successfully'
      });
    }

    // Try to parse successful response as JSON
    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data);
    } catch (e) {
      // If parsing fails but response was successful, return a success message
      console.log('Response not JSON but request was successful');
      return NextResponse.json({ 
        status: 'success',
        message: 'Call initiated successfully',
        raw_response: responseText.substring(0, 200) // Include first 200 chars of response for debugging
      });
    }
  } catch (error) {
    console.error('Error in voice webhook:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
} 