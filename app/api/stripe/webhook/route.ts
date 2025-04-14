import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { ANALYTICS_URL } from '@/app/lib/api';

// Check test mode based on Stripe key prefix
const stripeKey = process.env.STRIPE_RESTRICTED_KEY!;
const isTestMode = stripeKey.startsWith('rk_test_');
console.log('🔑 Stripe webhook mode:', isTestMode ? 'test' : 'live');

// Define valid subscription plans
const VALID_SUBSCRIPTION_PLANS = ['essential', 'professional', 'premium', 'custom'] as const;
type SubscriptionPlan = typeof VALID_SUBSCRIPTION_PLANS[number];

// Helper function to validate and normalize package names
function normalizePackageName(packageName: string): SubscriptionPlan {
  const normalized = packageName.toLowerCase();
  
  if (!VALID_SUBSCRIPTION_PLANS.includes(normalized as SubscriptionPlan)) {
    console.error('❌ Invalid package name:', packageName);
    console.error('Valid packages are:', VALID_SUBSCRIPTION_PLANS);
    throw new Error(`Invalid package name: ${packageName}`);
  }

  return normalized as SubscriptionPlan;
}

const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-01-27.acacia' as any,
  typescript: true,
  appInfo: {
    name: 'ZeCall Dashboard',
    version: '1.0.0'
  }
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function updateUserCredits(userId: string, amountInCents: number, subscriptionId: string) {
  try {
    const amountInEuros = amountInCents / 100;
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('amount', amountInEuros.toString());
    formData.append('stripe_payment_id', subscriptionId);

    const response = await fetch(`${ANALYTICS_URL}/api/credits/add`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to update credits');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to add credits:', error);
    throw error;
  }
}

async function updateUserSubscription(userId: string, packageName: string) {
  try {
    console.log('🔵 Updating subscription for user:', userId);
    console.log('🔵 Original package name:', packageName);

    const subscriptionPlan = normalizePackageName(packageName);
    console.log('🔵 Normalized subscription plan:', subscriptionPlan);

    const payload = {
      subscription_plan: subscriptionPlan,
      subscription_started_at: new Date().toISOString(),
      subscription_renewed_at: new Date().toISOString(),
      subscription_status: 'active',
      subscription_auto_renew: true
    };

    console.log('🔵 Sending subscription update payload:', payload);

    const response = await fetch(`${ANALYTICS_URL}/api/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();
    console.log('🔵 Subscription update response:', { status: response.status, data: responseData });

    if (!response.ok) {
      throw new Error(responseData.detail || 'Failed to update user subscription');
    }

    return responseData;
  } catch (error) {
    console.error('Failed to update user subscription:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature found' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const amountPaid = invoice.amount_paid;
        const subscriptionId = invoice.subscription as string;
        
        // Get customer to find user ID
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        
        let userId = null;
        if ('metadata' in customer && !customer.deleted) {
          userId = customer.metadata?.user_id;
        }

        // If no userId in customer, try subscription
        if (!userId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          userId = subscription.metadata?.user_id;
          
          // If found in subscription but not in customer, update customer
          if (userId && 'metadata' in customer && !customer.deleted && !customer.metadata?.user_id) {
            await stripe.customers.update(invoice.customer as string, {
              metadata: {
                ...customer.metadata,
                user_id: userId
              }
            });
          }
        }

        if (!userId || typeof amountPaid !== 'number') {
          throw new Error('Missing user ID or amount in invoice');
        }

        // Add subscription credits
        await updateUserCredits(userId, amountPaid, subscriptionId);

        // Only update subscription renewal date if this is not the first invoice (subscription creation)
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          console.log('🔵 Retrieved subscription:', {
            id: subscription.id,
            items: subscription.items.data,
            metadata: subscription.metadata
          });

          // Check if this is a renewal (not the first payment)
          const isRenewal = subscription.current_period_start > subscription.start_date;
          
          if (isRenewal) {
            console.log('🔵 Processing subscription renewal');
            // Get the package name from metadata (more reliable than price nickname)
            const packageName = subscription.metadata?.package || 'unknown';
            console.log('🔵 Package name from metadata:', packageName);
            
            const subscriptionPlan = normalizePackageName(packageName);
            console.log('🔵 Normalized subscription plan:', subscriptionPlan);
            
            const payload = {
              subscription_plan: subscriptionPlan,
              subscription_started_at: new Date(subscription.start_date * 1000).toISOString(),
              subscription_renewed_at: new Date().toISOString(),
              subscription_status: 'active',
              subscription_auto_renew: true
            };
            
            console.log('🔵 Sending renewal update payload:', payload);
            
            const response = await fetch(`${ANALYTICS_URL}/api/users/${userId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload)
            });

            const responseData = await response.json();
            console.log('🔵 Renewal update response:', { status: response.status, data: responseData });

            if (!response.ok) {
              console.error('Failed to update subscription renewal:', responseData);
            }
          } else {
            console.log('🔵 Skipping renewal update - this is the initial subscription payment');
          }
        }
        
        return NextResponse.json({ 
          message: 'Subscription payment processed successfully'
        });
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Only handle subscription checkouts
        if (session.mode !== 'subscription' || !session.subscription) {
          return NextResponse.json({ message: 'Non-subscription checkout completed' });
        }

        // Get customer to ensure we have the user ID
        const customer = await stripe.customers.retrieve(session.customer as string);
        if (!('metadata' in customer) || customer.deleted) {
          return NextResponse.json({ error: 'Invalid customer' }, { status: 400 });
        }

        const userId = customer.metadata?.user_id;
        if (!userId) {
          return NextResponse.json({ error: 'No userId found' }, { status: 400 });
        }

        // Get subscription to update its metadata
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        
        const metadata = {
          user_id: userId,
          package: session.metadata?.package || subscription.items.data[0]?.price?.nickname || 'unknown',
          billing_period: session.metadata?.billing_period || session.metadata?.billingPeriod || 'unknown'
        };

        // Update subscription and customer with complete metadata
        await Promise.all([
          stripe.subscriptions.update(session.subscription as string, { metadata }),
          stripe.customers.update(session.customer as string, { metadata }),
          // Update user subscription in backend
          updateUserSubscription(userId, metadata.package)
        ]);

        return NextResponse.json({ message: 'Subscription metadata updated' });
      }

      default: {
        return NextResponse.json({ message: 'Unhandled event type' });
      }
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook handler failed' },
      { status: 500 }
    );
  }
} 