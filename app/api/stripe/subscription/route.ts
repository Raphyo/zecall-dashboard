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
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get package and billing period from request body
    const body = await request.json();
    const packageName = body.package as SubscriptionPlan;
    const billingPeriod = body.billingPeriod as 'monthly' | 'yearly';

    if (!packageName || !SUBSCRIPTION_PRODUCTS[packageName]) {
      return NextResponse.json(
        { error: 'Invalid package selected' },
        { status: 400 }
      );
    }

    const product = SUBSCRIPTION_PRODUCTS[packageName];
    const priceId = billingPeriod === 'yearly' ? product.yearlyPriceId : product.monthlyPriceId;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Package not properly configured' },
        { status: 500 }
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
      // Update existing customer's metadata
      await stripe.customers.update(customerId, {
        metadata: {
          user_id: session.user.id,
        },
      });
    } else {
      const customer = await stripe.customers.create({
        email: session.user.email,
        metadata: {
          user_id: session.user.id,
        },
      });
      customerId = customer.id;
    }

    const metadata = {
      user_id: session.user.id,
      package: packageName,
      billing_period: billingPeriod,
    };

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
      subscription_data: {
        metadata: metadata,
      },
    });

    // Update customer metadata to ensure it's set
    await stripe.customers.update(customerId, {
      metadata: metadata,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
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
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
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
        autoRenew: data.subscription_auto_renew
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