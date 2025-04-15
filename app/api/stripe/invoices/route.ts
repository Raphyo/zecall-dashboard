import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_RESTRICTED_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function GET() {
  console.log('🔵 Fetching subscription invoices...');
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
      return NextResponse.json({ payments: [] });
    }

    const customerId = customers.data[0].id;

    // Fetch only subscription invoices
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 100,
      expand: ['data.subscription'],
    });

    console.log('🔍 Processing subscription invoices:', {
      count: invoices.data.length,
      first_invoice: invoices.data[0]?.id
    });

    // Process only subscription invoices
    const sanitizedPayments = invoices.data
      .filter(inv => inv.subscription) // Only keep subscription invoices
      .map(inv => {
        const subscription = inv.subscription as Stripe.Subscription;
        const packageName = subscription?.metadata?.package;
        if (!packageName) {
          console.warn(`⚠️ No package name found for subscription ${subscription.id}`);
        }
        const isFirstInvoice = !inv.billing_reason || inv.billing_reason === 'subscription_create';
        
        // Construct a descriptive label
        const description = isFirstInvoice
          ? `Abonnement initial${packageName ? ` - Forfait ${packageName}` : ''}`
          : `Renouvellement${packageName ? ` - Forfait ${packageName}` : ''}`;

        console.log(`🧾 Processing invoice ${inv.id}:`, {
          subscription_id: inv.subscription,
          package: packageName,
          billing_reason: inv.billing_reason,
          status: inv.status,
          amount: inv.amount_paid
        });

        return {
          id: inv.id,
          date: inv.created * 1000,
          amount: inv.amount_paid / 100,
          status: inv.status,
          description,
          receipt_url: inv.invoice_pdf || null,
          period_start: inv.period_start * 1000,
          period_end: inv.period_end * 1000,
          is_first_invoice: isFirstInvoice
        };
      })
      .sort((a, b) => b.date - a.date); // Sort by date, newest first

    console.log('✅ Subscription invoices fetched successfully:', {
      count: sanitizedPayments.length,
      payments: sanitizedPayments
    });

    return NextResponse.json({ payments: sanitizedPayments });
  } catch (error) {
    console.error('❌ Error fetching subscription invoices:', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : error
    });
    return NextResponse.json(
      { error: 'Error fetching subscription invoices' },
      { status: 500 }
    );
  }
} 