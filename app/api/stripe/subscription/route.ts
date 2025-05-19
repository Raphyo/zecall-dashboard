import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import Stripe from 'stripe';
import { ANALYTICS_URL } from '@/app/lib/api';

const stripe = new Stripe(process.env.STRIPE_RESTRICTED_KEY!, {
  apiVersion: '2025-02-24.acacia',
  typescript: true,
  appInfo: {
    name: 'ZeCall Dashboard',
    version: '1.0.0'
  }
});

// Define valid subscription plans
const VALID_SUBSCRIPTION_PLANS = ['essential', 'professional', 'premium'] as const;
type SubscriptionPlan = typeof VALID_SUBSCRIPTION_PLANS[number];

interface SubscriptionProduct {
  productId?: string;
  monthlyPriceId?: string;
  yearlyPriceId?: string;
  minutes: number;
}

// Define product IDs for each package
const SUBSCRIPTION_PRODUCTS: Record<SubscriptionPlan, SubscriptionProduct> = {
  essential: {
    productId: 'prod_S81X3GYMZaVBr7',
    monthlyPriceId: 'price_1RDoqdH8gdjFoz1Jr8vBoRbL',
    yearlyPriceId: process.env.STRIPE_ESSENTIAL_YEARLY_PRICE_ID,
    minutes: 200
  },
  professional: {
    monthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    yearlyPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    minutes: 800
  },
  premium: {
    monthlyPriceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    yearlyPriceId: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
    minutes: 3200
  }
};

export async function POST(request: Request) {
  try {
    console.log('🟦 Starting subscription checkout creation');
    const session = await auth();
    
    if (!session?.user?.email) {
      console.log('❌ No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get package and billing period from request body
    const body = await request.json();
    const packageName = body.package as SubscriptionPlan;
    const billingPeriod = body.billingPeriod as 'monthly' | 'yearly';
    console.log('🟦 Subscription request:', { packageName, billingPeriod });

    if (!packageName || !SUBSCRIPTION_PRODUCTS[packageName]) {
      console.log('❌ Invalid package selected:', packageName);
      return NextResponse.json(
        { error: 'Invalid package selected' },
        { status: 400 }
      );
    }

    const product = SUBSCRIPTION_PRODUCTS[packageName];
    const priceId = billingPeriod === 'yearly' ? product.yearlyPriceId : product.monthlyPriceId;
    console.log('🟦 Selected product:', { packageName, priceId, minutes: product.minutes });

    if (!priceId) {
      console.log('❌ Package not configured:', { packageName, billingPeriod });
      return NextResponse.json(
        { error: 'Package not properly configured' },
        { status: 500 }
      );
    }

    // Get or create customer
    console.log('🟦 Looking up customer for email:', session.user.email);
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log('🟦 Found existing customer:', customerId);
      // Update existing customer's metadata
      await stripe.customers.update(customerId, {
        metadata: {
          user_id: session.user.id,
        },
      });
      console.log('🟦 Updated existing customer metadata');
    } else {
      console.log('🟦 Creating new customer');
      const customer = await stripe.customers.create({
        email: session.user.email,
        metadata: {
          user_id: session.user.id,
        },
      });
      customerId = customer.id;
      console.log('🟦 Created new customer:', customerId);
    }

    const metadata = {
      user_id: session.user.id,
      package: packageName,
      billing_period: billingPeriod,
    };
    console.log('🟦 Preparing checkout session with metadata:', metadata);

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=cancelled`,
      metadata: metadata,
    });
    console.log('✅ Successfully created checkout session:', checkoutSession.id);

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('❌ Error creating subscription checkout:', error);
    return NextResponse.json(
      { error: 'Error creating subscription checkout session' },
      { status: 500 }
    );
  }
}

// Add GET endpoint to fetch user's subscription status
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get customer to fetch Stripe subscription details
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    });

    let endDate: string | null = null;

    if (customers.data.length > 0) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        if (subscription.cancel_at_period_end) {
          endDate = new Date(subscription.current_period_end * 1000).toISOString();
        }
      }
    }

    // Fetch user subscription from backend
    const response = await fetch(`${ANALYTICS_URL}/api/users/${session.user.id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch user subscription');
    }

    return NextResponse.json({
      subscription: {
        plan: data.subscription_plan,
        status: data.subscription_status,
        autoRenew: data.subscription_auto_renew,
        endDate: endDate
      }
    });
  } catch (error) {
    console.error('Failed to fetch subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    console.log('🟦 Starting subscription cancellation');
    const session = await auth();
    
    if (!session?.user?.email || !session?.user?.id) {
      console.log('❌ No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get customer
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    const customerId = customers.data[0].id;

    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    const subscription = subscriptions.data[0];

    // Cancel the subscription at period end
    await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

    // Update user subscription in analytics backend
    const payload = {
      subscription_plan: subscription.metadata?.package || 'unknown',
      subscription_status: 'active', // Keep it active until the end of period
      subscription_auto_renew: false, // Mark it as non-renewing
      subscription_started_at: new Date(subscription.start_date * 1000).toISOString(),
      subscription_renewed_at: new Date(subscription.current_period_start * 1000).toISOString()
    };

    const response = await fetch(`${ANALYTICS_URL}/api/users/${session.user.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Failed to update user subscription');
    }

    return NextResponse.json({
      message: 'Subscription cancelled successfully',
      willEndAt: new Date(subscription.current_period_end * 1000).toISOString()
    });
  } catch (error) {
    console.error('❌ Error cancelling subscription:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
} 