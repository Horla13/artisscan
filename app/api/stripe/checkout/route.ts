import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

type BillingCycle = 'monthly' | 'yearly';

function getSiteUrl(req: NextRequest): string {
  const envUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  const origin = req.headers.get('origin');
  if (origin) return origin.replace(/\/$/, '');
  return 'http://localhost:3000';
}

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const priceMonthly = process.env.STRIPE_PRICE_ID_MONTHLY;
  const priceYearly = process.env.STRIPE_PRICE_ID_YEARLY;

  if (!stripeSecretKey || !supabaseUrl || !serviceRoleKey || !priceMonthly || !priceYearly) {
    console.error('❌ /api/stripe/checkout: configuration manquante');
    return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 });
  }
  // 🔒 Interdire Stripe Live (V1 = test mode uniquement)
  if (stripeSecretKey.startsWith('sk_live_')) {
    console.error('⛔ /api/stripe/checkout: clé Stripe LIVE détectée (interdit en V1)');
    return NextResponse.json({ error: 'Stripe live interdit. Utilisez une clé sk_test.' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('⛔ /api/stripe/checkout: token manquant');
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const token = authHeader.slice('Bearer '.length);
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !user) {
    console.warn('⛔ /api/stripe/checkout: token invalide', userErr?.message);
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
  }

  let billingCycle: BillingCycle | null = null;
  try {
    const body = await req.json();
    billingCycle = body?.billingCycle;
  } catch {
    // ignore
  }

  if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
    return NextResponse.json({ error: 'billingCycle invalide' }, { status: 400 });
  }

  const priceId = billingCycle === 'monthly' ? priceMonthly : priceYearly;
  const siteUrl = getSiteUrl(req);

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-12-15.clover' });

  console.log('🧾 Checkout: création session', { supabase_user_id: user.id, billingCycle, priceId });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    // ✅ Permettre les codes promo Stripe (simple, sans UI additionnelle)
    allow_promotion_codes: true,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        supabase_user_id: user.id,
        billingCycle,
      },
    },
    metadata: {
      supabase_user_id: user.id,
      billingCycle,
    },
    success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/pricing`,
  });

  console.log('✅ Checkout: session créée', { session_id: session.id, url: session.url });

  if (!session.url) {
    console.error('❌ Checkout: session.url manquante', { id: session.id });
    return NextResponse.json({ error: 'Impossible de créer la session' }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}


