import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error('❌ Variables d\'environnement manquantes pour le Webhook');
    return NextResponse.json({ error: 'Config error' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20',
  });

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Erreur signature Webhook: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const clientReferenceId = session.client_reference_id; // Optionnel : l'ID Supabase passé lors du checkout
        
        // Si on n'a pas passé clientReferenceId, on peut chercher par email
        const userEmail = session.customer_details?.email;

        if (userEmail) {
          // Récupérer l'ID utilisateur via l'email (si Auth Supabase permet la recherche)
          // Mais le plus sûr est de passer client_reference_id dans checkout/route.ts
          
          // Mise à jour simplifiée via metadata ou client_reference_id
          const userId = session.metadata?.supabase_user_id || clientReferenceId;

          if (userId) {
            await supabase
              .from('profiles')
              .update({
                stripe_customer_id: customerId,
                subscription_tier: 'pro',
                subscription_status: 'active',
                updated_at: new Date().toISOString()
              })
              .eq('id', userId);
            
            console.log(`✅ Profil mis à jour (Abonnement PRO) pour ${userId}`);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', customerId);
        
        console.log(`❌ Abonnement résilié pour le client ${customerId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status;

        await supabase
          .from('profiles')
          .update({
            subscription_status: status,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', customerId);
        
        console.log(`ℹ️ Abonnement mis à jour (${status}) pour le client ${customerId}`);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('❌ Erreur traitement Webhook:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

