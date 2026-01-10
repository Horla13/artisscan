import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Route officielle : /api/stripe/webhook
// (Autonome : ne dépend d’aucun ancien fichier "stripe-webhook" ou "webhook")
export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey || !stripeWebhookSecret) {
    return NextResponse.json({ received: false, error: 'Config missing' }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ received: false, error: 'Missing signature' }, { status: 400 });
    }

    const rawBody = await req.text();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
    } catch (err: any) {
      return NextResponse.json({ received: false, error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId =
        (session.metadata?.supabase_user_id || '').trim() ||
        (session.client_reference_id || '').toString().trim();

      if (!userId) {
        // IMPORTANT: on répond 200 pour Stripe, mais on loggue l’erreur pour diagnostic
        console.error('[stripe-webhook] Missing supabase_user_id in metadata/client_reference_id', {
          sessionId: session.id,
        });
        return NextResponse.json({ received: true, error: 'Missing supabase_user_id' }, { status: 200 });
      }

      const customerId = (session.customer as string) || null;

      const { error } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          is_pro: true,
          plan: 'pro',
          subscription_status: 'active',
          subscription_tier: 'pro',
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('[stripe-webhook] Supabase update error', error);
        return NextResponse.json({ received: true, error: error.message }, { status: 200 });
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error('[stripe-webhook] Unhandled error', err);
    return NextResponse.json({ received: true, error: err?.message || 'Unknown error' }, { status: 200 });
  }
}


