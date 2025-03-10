import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_RESTRICTED_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(request: Request) {
  console.log('🔵 Starting customer portal session creation...');
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

    // Get or create Stripe customer
    console.log('🔍 Looking up Stripe customer for email:', session.user.email);
    let customer;
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    });
    console.log('📋 Existing customers found:', customers.data.length);

    if (customers.data.length > 0) {
      customer = customers.data[0];
      console.log('✅ Found existing customer:', { 
        customerId: customer.id,
        email: customer.email 
      });
    } else {
      console.log('🆕 Creating new Stripe customer...');
      customer = await stripe.customers.create({
        email: session.user.email,
        metadata: {
          userId: session.user.email,
        },
      });
      console.log('✅ Created new customer:', { 
        customerId: customer.id,
        email: customer.email 
      });
    }

    // Create customer portal session
    console.log('🔧 Creating portal session for customer:', customer.id);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    });
    console.log('✅ Portal session created successfully:', { 
      sessionId: portalSession.id,
      returnUrl: portalSession.return_url 
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('❌ Stripe customer portal session creation error:', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : error
    });
    return NextResponse.json(
      { error: 'Error creating customer portal session' },
      { status: 500 }
    );
  }
} 