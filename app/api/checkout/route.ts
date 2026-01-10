import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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

    // ✅ Récupération sécurisée du user Supabase via Bearer token (ne pas faire confiance au body)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Configuration Supabase manquante.' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
    if (!token) {
      return NextResponse.json({ error: 'Veuillez vous connecter avant de démarrer le paiement.' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Veuillez vous reconnecter puis réessayer.' }, { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.email || undefined;

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
        // ✅ Metadata sur la Subscription (utile si on traite d'autres events que checkout.session.completed)
        metadata: {
          supabase_user_id: userId,
        },
      },
      // Checkout doit être lié à un user Supabase
      customer_email: userEmail,
      metadata: {
        supabase_user_id: userId,
      },
      // Retour vers une page de vérification (redirection auto ensuite)
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      allow_promotion_codes: true,
    };

    // ✅ Fallback robuste côté webhook si metadata absente (visible sur la session)
    sessionOptions.client_reference_id = userId;

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


