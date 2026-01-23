import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-12-15.clover' });

  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error('❌ Signature invalide', err?.message);
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const supabaseUserId = session.metadata?.supabase_user_id || session.client_reference_id;

        if (!supabaseUserId) {
          console.warn('⚠️ Session sans supabase_user_id', { session_id: session.id });
          break;
        }

        console.log('✅ Checkout session reçu', {
          session_id: session.id,
          supabaseUserId,
          subscription: session.subscription,
        });

        // Mise à jour simple de Supabase
        if (session.subscription) {
          const stripeSubscriptionId = session.subscription.toString();
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_status: 'active',
              stripe_subscription_id: stripeSubscriptionId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', supabaseUserId);
          console.log('✅ Supabase update simple', { supabaseUserId, stripeSubscriptionId });
        }
        break;
      }

      default:
        console.log('ℹ️ Event ignoré', event.type);
        break;
    }
  } catch (err: any) {
    console.error('❌ Webhook handler error', err?.message);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}


