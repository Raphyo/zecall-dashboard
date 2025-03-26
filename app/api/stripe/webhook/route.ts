import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { ANALYTICS_URL } from '@/app/lib/api';

// Make sure we're using test mode
const isTestMode = process.env.NODE_ENV === 'development';
console.log('🔑 Stripe webhook mode:', isTestMode ? 'test' : 'live');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_RESTRICTED_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// This is your Stripe CLI webhook secret for testing your endpoint locally.
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (!sig || !endpointSecret) {
      throw new Error('Missing stripe-signature or endpoint secret');
    }
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    const error = err as Error;
    console.error('❌ Webhook signature verification failed:', error.message);
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💰 Processing completed checkout session:', session.id);
        
        // Extract amount and userId from metadata
        const amount = Number(session.metadata?.amount || 0);
        const userId = session.metadata?.userId; // This should now be the actual user ID
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

        break;
      }
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook handler error:', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : error
    });
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
} 