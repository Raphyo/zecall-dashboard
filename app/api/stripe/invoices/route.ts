import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_RESTRICTED_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function GET() {
  console.log('🔵 Fetching payment history...');
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

    // Fetch both payment intents and invoices
    const [paymentIntents, invoices] = await Promise.all([
      stripe.paymentIntents.list({
        customer: customerId,
        limit: 100,
        expand: ['data.charges.data', 'data.latest_charge'],
      }),
      stripe.invoices.list({
        customer: customerId,
        limit: 100,
      }),
    ]);

    console.log('🔍 First payment intent data:', {
      id: paymentIntents.data[0]?.id,
      charges: (paymentIntents.data[0] as any)?.charges?.data,
      latest_charge: (paymentIntents.data[0] as any)?.latest_charge,
    });

    // Combine and sanitize payment data
    const sanitizedPayments = [
      ...paymentIntents.data
        .filter(pi => pi.status === 'succeeded')
        .map(pi => {
          const charge = (pi as any).latest_charge || (pi as any).charges?.data[0];
          console.log(`🧾 Processing payment ${pi.id}:`, {
            charge_id: charge?.id,
            receipt_url: charge?.receipt_url,
            hosted_receipt_url: charge?.hosted_receipt_url
          });
          return {
            id: pi.id,
            date: pi.created * 1000,
            amount: pi.amount / 100,
            status: pi.status,
            description: pi.description || 'Recharge ZeCall',
            receipt_url: charge?.hosted_receipt_url || charge?.receipt_url || null,
          };
        }),
      ...invoices.data
        .filter(inv => inv.status === 'paid')
        .map(inv => ({
          id: inv.id,
          date: inv.created * 1000,
          amount: inv.amount_paid / 100,
          status: inv.status,
          description: inv.description || 'Facture ZeCall',
          receipt_url: inv.invoice_pdf || null,
        })),
    ].sort((a, b) => b.date - a.date); // Sort by date, newest first

    console.log('✅ Payment history fetched successfully:', {
      count: sanitizedPayments.length,
      payments: sanitizedPayments
    });

    return NextResponse.json({ payments: sanitizedPayments });
  } catch (error) {
    console.error('❌ Error fetching payment history:', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : error
    });
    return NextResponse.json(
      { error: 'Error fetching payment history' },
      { status: 500 }
    );
  }
} 