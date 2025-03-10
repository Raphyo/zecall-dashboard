import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_RESTRICTED_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function GET() {
  console.log('🔵 Fetching payment methods...');
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

    // Get customer
    const customers = await stripe.customers.list({
      email: session.user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json({ paymentMethods: [] });
    }

    // Fetch payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customers.data[0].id,
      type: 'card',
    });

    // Return sanitized payment method data
    const sanitizedPaymentMethods = paymentMethods.data.map(pm => ({
      id: pm.id,
      last4: pm.card?.last4,
      brand: pm.card?.brand,
      expiryMonth: pm.card?.exp_month,
      expiryYear: pm.card?.exp_year,
      isDefault: pm.id === customers.data[0].invoice_settings?.default_payment_method,
    }));

    console.log('✅ Payment methods fetched successfully:', {
      count: sanitizedPaymentMethods.length
    });

    return NextResponse.json({ paymentMethods: sanitizedPaymentMethods });
  } catch (error) {
    console.error('❌ Error fetching payment methods:', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : error
    });
    return NextResponse.json(
      { error: 'Error fetching payment methods' },
      { status: 500 }
    );
  }
} 