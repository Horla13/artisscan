import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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
  if (!stripeSecretKey || !supabaseUrl || !serviceRoleKey) {
    console.error('❌ /api/stripe/portal: configuration manquante');
    return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const token = authHeader.slice('Bearer '.length);
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !user) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  const customerId = profile?.stripe_customer_id || null;
  if (!customerId) {
    return NextResponse.json({ error: 'Aucun client Stripe', redirectTo: '/pricing' }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-12-15.clover' });
  const returnUrl = `${getSiteUrl(req)}/dashboard`;

  console.log('🧾 Customer Portal: création session', { user_id: user.id, customer: customerId });
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  if (!session.url) {
    return NextResponse.json({ error: 'URL Portal manquante' }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}


