import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_RESTRICTED_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
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

    // Process only subscription invoices
    const sanitizedPayments = invoices.data
      .filter(inv => inv.subscription) // Only keep subscription invoices
      .map(inv => {
        const subscription = inv.subscription as Stripe.Subscription;
        const packageName = subscription?.metadata?.package;
        const isFirstInvoice = !inv.billing_reason || inv.billing_reason === 'subscription_create';
        
        // Construct a descriptive label
        const description = isFirstInvoice
          ? `Abonnement initial${packageName ? ` - Forfait ${packageName}` : ''}`
          : `Renouvellement${packageName ? ` - Forfait ${packageName}` : ''}`;

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

    return NextResponse.json({ payments: sanitizedPayments });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error fetching subscription invoices' },
      { status: 500 }
    );
  }
} 