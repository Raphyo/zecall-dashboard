import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserIdFromEmail } from '@/app/lib/user-mapping';
import { ANALYTICS_URL } from '@/app/lib/api';

// Make sure we're using test mode
const isTestMode = process.env.NODE_ENV === 'development';
console.log('🔑 Stripe webhook mode:', isTestMode ? 'test' : 'live');

const stripe = new Stripe(process.env.STRIPE_RESTRICTED_KEY!, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
  appInfo: {
    name: 'ZeCall Dashboard',
    version: '1.0.0'
  }
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.error('❌ No Stripe signature found in webhook request');
    return NextResponse.json(
      { error: 'No signature found' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('✅ Webhook signature verified, processing event:', event.type);
  } catch (err) {
    const error = err as Error;
    console.error('❌ Webhook signature verification failed:', error.message);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💰 Processing completed checkout session:', session.id);
        
        // Extract amount and userEmail from metadata
        const amount = Number(session.metadata?.amount || 0);
        const userEmail = session.metadata?.userId; // This is actually the email
        const paymentIntentId = typeof session.payment_intent === 'string' ? 
          session.payment_intent : 
          session.payment_intent?.id;

        // Validate all required data
        if (!userEmail) {
          throw new Error('No user email found in session metadata');
        }
        if (!amount || amount <= 0) {
          throw new Error('Invalid amount in session metadata');
        }
        if (!paymentIntentId) {
          throw new Error('No payment intent ID found in session');
        }

        // Get actual user ID from email
        const userId = await getUserIdFromEmail(userEmail);
        if (!userId) {
          throw new Error(`User not found for email: ${userEmail}`);
        }

        // Validate backend URL
        if (!ANALYTICS_URL) {
          throw new Error('ANALYTICS_URL is not configured');
        }

        console.log('✅ Adding funds:', {
          userEmail,
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
          const data = await response.json();
          throw new Error(data.detail || 'Failed to add funds');
        }

        const result = await response.json();
        console.log('✅ Credits added successfully:', result);
        break;
      }
      default: {
        console.log('⏩ Ignoring unhandled event type:', event.type);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook handler failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook handler failed' },
      { status: 500 }
    );
  }
} 