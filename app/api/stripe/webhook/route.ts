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
    console.log('🟦 Starting credit update:', { userId, amountInCents, subscriptionId });
    const amountInEuros = amountInCents / 100;
    console.log('🟦 Converting cents to euros:', { amountInCents, amountInEuros });

    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('amount', amountInEuros.toString());
    formData.append('stripe_payment_id', subscriptionId);

    console.log('🟦 Sending credit update request:', {
      endpoint: `${ANALYTICS_URL}/api/credits/add`,
      userId,
      amount: amountInEuros,
      subscriptionId
    });

    const response = await fetch(`${ANALYTICS_URL}/api/credits/add`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Failed to update credits:', errorData);
      throw new Error(errorData.detail || 'Failed to update credits');
    }

    const result = await response.json();
    console.log('✅ Successfully updated credits:', result);
    return result;
  } catch (error) {
    console.error('❌ Error in updateUserCredits:', error);
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
  console.log('🟦 Received webhook event');
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.log('❌ No stripe signature found in webhook request');
    return NextResponse.json(
      { error: 'No signature found' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('🟦 Webhook event verified:', event.type);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'invoice.paid': {
        console.log('🟦 Processing invoice.paid event');
        const invoice = event.data.object as Stripe.Invoice;
        console.log('🟦 Invoice details:', {
          amount_paid: invoice.amount_paid,
          subscription: invoice.subscription,
          customer: invoice.customer
        });

        const amountPaid = invoice.amount_paid;
        const subscriptionId = invoice.subscription as string;
        
        // Get customer to find user ID
        console.log('🟦 Retrieving customer:', invoice.customer);
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        
        let userId = null;
        if ('metadata' in customer && !customer.deleted) {
          userId = customer.metadata?.user_id;
          console.log('🟦 Found userId in customer metadata:', userId);
        }

        // If no userId in customer, try subscription
        if (!userId && subscriptionId) {
          console.log('🟦 Looking up userId in subscription metadata');
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          userId = subscription.metadata?.user_id;
          console.log('🟦 Found userId in subscription metadata:', userId);
          
          // If found in subscription but not in customer, update customer
          if (userId && 'metadata' in customer && !customer.deleted && !customer.metadata?.user_id) {
            console.log('🟦 Updating customer metadata with userId');
            await stripe.customers.update(invoice.customer as string, {
              metadata: {
                ...customer.metadata,
                user_id: userId
              }
            });
          }
        }

        if (!userId || typeof amountPaid !== 'number') {
          console.error('❌ Missing required data:', { userId, amountPaid });
          throw new Error('Missing user ID or amount in invoice');
        }

        // Add subscription credits
        console.log('🟦 Adding subscription credits');
        await updateUserCredits(userId, amountPaid, subscriptionId);

        // Only update subscription renewal date if this is not the first invoice
        if (subscriptionId) {
          console.log('🟦 Checking if this is a renewal');
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          
          // Check if this is a renewal (not the first payment)
          const isRenewal = subscription.current_period_start > subscription.start_date;
          console.log('🟦 Is renewal payment:', isRenewal, {
            current_period_start: subscription.current_period_start,
            start_date: subscription.start_date
          });
          
          if (isRenewal) {
            console.log('🟦 Processing subscription renewal');
            const packageName = subscription.metadata?.package || 'unknown';
            
            const subscriptionPlan = normalizePackageName(packageName);
            console.log('🟦 Renewal details:', {
              packageName,
              subscriptionPlan,
              userId
            });
            
            const payload = {
              subscription_plan: subscriptionPlan,
              subscription_started_at: new Date(subscription.start_date * 1000).toISOString(),
              subscription_renewed_at: new Date().toISOString(),
              subscription_status: 'active',
              subscription_auto_renew: true
            };
            
            console.log('🟦 Updating subscription renewal status');
            const response = await fetch(`${ANALYTICS_URL}/api/users/${userId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload)
            });

            const responseData = await response.json();
            if (!response.ok) {
              console.error('❌ Failed to update subscription renewal:', responseData);
            } else {
              console.log('✅ Successfully updated subscription renewal:', responseData);
            }
          } else {
            console.log('🟦 Skipping renewal update - this is the initial subscription payment');
          }
        }
        
        console.log('✅ Successfully processed subscription payment');
        return NextResponse.json({ 
          message: 'Subscription payment processed successfully'
        });
      }

      case 'checkout.session.completed': {
        console.log('🟦 Processing checkout.session.completed event');
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('🟦 Checkout session details:', {
          mode: session.mode,
          subscription: session.subscription,
          metadata: session.metadata
        });

        // Only handle subscription checkouts
        if (session.mode !== 'subscription' || !session.subscription) {
          console.log('🟦 Skipping non-subscription checkout');
          return NextResponse.json({ message: 'Non-subscription checkout completed' });
        }

        // Get customer to ensure we have the user ID
        console.log('🟦 Retrieving customer:', session.customer);
        const customer = await stripe.customers.retrieve(session.customer as string);
        if (!('metadata' in customer) || customer.deleted) {
          console.error('❌ Invalid customer:', session.customer);
          return NextResponse.json({ error: 'Invalid customer' }, { status: 400 });
        }

        // Get user ID from session metadata
        const userId = session.metadata?.user_id;
        if (!userId) {
          console.error('❌ No userId found in session metadata');
          return NextResponse.json({ error: 'No userId found in session metadata' }, { status: 400 });
        }

        console.log('🟦 Retrieving subscription:', session.subscription);
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        
        const metadata = {
          user_id: userId,
          package: session.metadata?.package || 'unknown',
          billing_period: session.metadata?.billing_period || 'unknown'
        };

        console.log('🟦 Setting subscription metadata:', metadata);

        try {
          console.log('🟦 Updating subscription and customer with metadata');
          await Promise.all([
            stripe.subscriptions.update(session.subscription as string, { metadata }),
            stripe.customers.update(session.customer as string, { metadata }),
            updateUserSubscription(userId, metadata.package)
          ]);

          console.log('✅ Successfully completed subscription setup');
          return NextResponse.json({ 
            message: 'Subscription created and metadata updated successfully',
            metadata: metadata
          });
        } catch (error) {
          console.error('❌ Failed to update subscription metadata:', error);
          return NextResponse.json({ 
            error: 'Failed to update subscription metadata',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }
      }

      default: {
        console.log('🟦 Unhandled event type:', event.type);
        return NextResponse.json({ message: 'Unhandled event type' });
      }
    }
  } catch (error) {
    console.error('❌ Webhook handler failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook handler failed' },
      { status: 500 }
    );
  }
} 