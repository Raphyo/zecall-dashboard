import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { ANALYTICS_URL } from '@/app/lib/api';

// Check if we're using test mode based on the API key prefix
const isTestMode = process.env.STRIPE_RESTRICTED_KEY?.startsWith('rk_test_');
console.log('🔑 Stripe webhook mode:', isTestMode ? 'test' : 'live');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_RESTRICTED_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// This is your Stripe CLI webhook secret for testing your endpoint locally.
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Set CORS headers to allow Stripe
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
};

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  console.log('🎯 Webhook endpoint hit');
  
  try {
    const body = await request.text();
    console.log('📦 Request body length:', body.length);
    
    const sig = request.headers.get('stripe-signature');
    console.log('🔐 Stripe signature present:', !!sig);

    let event: Stripe.Event;

    try {
      if (!sig || !endpointSecret) {
        throw new Error('Missing stripe-signature or endpoint secret');
      }
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
      console.log('✅ Webhook signature verified, processing event:', event.type);
    } catch (err) {
      const error = err as Error;
      console.error('❌ Webhook signature verification failed:', error.message);
      return new NextResponse(
        JSON.stringify({ error: `Webhook Error: ${error.message}` }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log('💰 Processing completed checkout session:', session.id);
          
          // Extract amount and userId from metadata
          const amount = Number(session.metadata?.amount || 0);
          const userId = session.metadata?.userId;
          const paymentIntentId = typeof session.payment_intent === 'string' ? 
            session.payment_intent : 
            session.payment_intent?.id;

          // Validate all required data
          if (!userId) {
            throw new Error('No user ID found in session metadata');
          }
          if (!amount || amount <= 0) {
            throw new Error('Invalid amount in session metadata');
          }
          if (!paymentIntentId) {
            throw new Error('No payment intent ID found in session');
          }

          // Validate backend URL
          if (!ANALYTICS_URL) {
            throw new Error('ANALYTICS_URL is not configured');
          }

          console.log('✅ Adding funds:', {
            userId,
            amount,
            paymentIntent: paymentIntentId,
          });
          
          // Make request to backend API
          const formData = new FormData();
          formData.append('user_id', userId);
          formData.append('amount', amount.toString());
          formData.append('stripe_payment_id', paymentIntentId);

          console.log('🔵 Adding credits at:', `${ANALYTICS_URL}/api/credits/add`);
          const response = await fetch(`${ANALYTICS_URL}/api/credits/add`, {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to add credits: ${error}`);
          }

          console.log('✅ Credits added successfully');
          break;
        }
        default:
          console.log(`⏩ Ignoring unhandled event type ${event.type}`);
      }

      return new NextResponse(JSON.stringify({ received: true }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    } catch (error) {
      console.error('❌ Webhook handler error:', {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : error
      });
      return new NextResponse(
        JSON.stringify({ error: 'Webhook handler failed' }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
  } catch (error) {
    console.error('❌ Unexpected webhook error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Unexpected webhook error' }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
} 