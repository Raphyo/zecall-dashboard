import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import Stripe from 'stripe';

// Check if we're using test mode based on the API key prefix
const isTestMode = process.env.STRIPE_RESTRICTED_KEY?.startsWith('rk_test_');
console.log('🔑 Stripe mode:', isTestMode ? 'test' : 'live');

// Log the API key prefix to help debug (safely)
const apiKeyPrefix = process.env.STRIPE_RESTRICTED_KEY?.startsWith('rk_test_') ? 'rk_test_' : 'rk_live_';
console.log('🔑 API key prefix:', apiKeyPrefix);

// Warn if using live key in test environment
if (isTestMode && apiKeyPrefix === 'rk_live_') {
  console.warn('⚠️ Warning: Using live API key with test mode!');
}

const stripe = new Stripe(process.env.STRIPE_RESTRICTED_KEY!, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
  appInfo: {
    name: 'ZeCall Dashboard',
    version: '1.0.0'
  }
});

export async function POST(request: Request) {
  console.log('🔵 Creating checkout session...');
  try {
    const session = await auth();
    console.log('🔑 Auth session:', { 
      email: session?.user?.email,
      authenticated: !!session?.user 
    });
    
    if (!session?.user?.email) {
      console.log('❌ Authentication failed: No user email found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get amount from request body
    const body = await request.json();
    const amountInEuros = Number(body.amount);

    // Validate amount
    if (!amountInEuros || amountInEuros < 15) {
      return NextResponse.json(
        { error: 'Le montant minimum est de 15€' },
        { status: 400 }
      );
    }

    // Get or create customer
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: session.user.email,
        metadata: {
          userId: session.user.id,
        },
      });
      customerId = customer.id;
    }

    // Create Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Recharge ZeCall',
              description: process.env.NODE_ENV === 'development' ? 
                'Recharge de votre solde ZeCall (Test: utilisez 4242 4242 4242 4242 comme numéro de carte)' : 
                'Recharge de votre solde ZeCall',
            },
            unit_amount: Math.round(amountInEuros * 100), // Convert euros to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=cancelled`,
      metadata: {
        amount: amountInEuros, // Store original amount in euros
        userId: session.user.id,
      },
    });

    console.log('✅ Checkout session created:', {
      sessionId: checkoutSession.id,
      customerId,
      amountInEuros,
      amountInCents: Math.round(amountInEuros * 100),
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('❌ Error creating checkout session:', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : error
    });
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    );
  }
} 