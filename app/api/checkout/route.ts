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
    
    // LOG CRITIQUE : Vérification de l'ID envoyé à Stripe
    console.log(`[STRIPE CHECKOUT] CYCLE: ${billingCycle} | PRICE_ID: ${priceId}`);

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });

    const baseUrl = getBaseUrl(req);

    const sessionOptions: any = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
      },
      customer_email: body?.userEmail || undefined,
      metadata: {
        supabase_user_id: userId || '',
        supabase_user_email: body?.userEmail || '',
      },
      // Retour direct vers le dashboard après paiement
      success_url: `https://artisscan.vercel.app/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      allow_promotion_codes: true,
    };

    // N'ajouter client_reference_id que si l'utilisateur est connecté (Bulldozer mode)
    if (userId && userId !== '') {
      sessionOptions.client_reference_id = userId;
    }

    const session = await stripe.checkout.sessions.create(sessionOptions);

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Erreur Stripe Checkout:', err);
    return NextResponse.json(
      { error: err?.message || 'Erreur lors de la création du paiement.' },
      { status: 500 }
    );
  }
}


