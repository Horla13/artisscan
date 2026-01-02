import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

type BillingCycle = 'monthly' | 'yearly';

function getBaseUrl(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (origin) return origin;
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

export async function POST(req: NextRequest) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY manquante dans l'environnement." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const billingCycle = (body?.billingCycle as BillingCycle) || 'monthly';
    const userId = body?.userId;

    const monthlyPriceId = process.env.STRIPE_PRICE_ID_MONTHLY?.trim();
    const yearlyPriceId = process.env.STRIPE_PRICE_ID_YEARLY?.trim();
    if (!monthlyPriceId || !yearlyPriceId) {
      return NextResponse.json(
        { error: "STRIPE_PRICE_ID_MONTHLY / STRIPE_PRICE_ID_YEARLY manquants dans l'environnement." },
        { status: 500 }
      );
    }

    const priceId = billingCycle === 'yearly' ? yearlyPriceId : monthlyPriceId;
    
    // Debug pour Vercel Logs
    console.log(`[STRIPE DEBUG] Cycle: ${billingCycle} | ID utilisé: "${priceId}" | User: ${userId || 'Non identifié'}`);

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });

    const baseUrl = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
      },
      client_reference_id: userId,
      metadata: {
        supabase_user_id: userId || '',
      },
      success_url: `${baseUrl}/dashboard?checkout=success`,
      cancel_url: `${baseUrl}/#tarification`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Erreur Stripe Checkout:', err);
    return NextResponse.json(
      { error: err?.message || 'Erreur lors de la création du paiement.' },
      { status: 500 }
    );
  }
}


