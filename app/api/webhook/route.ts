import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  console.log('🔔 WEBHOOK STRIPE: Requête POST reçue');
  
  // 1. Vérification des variables d'environnement
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error('❌ Variables d\'environnement manquantes');
    return NextResponse.json({ error: 'Config error' }, { status: 500 });
  }

  // 2. Initialisation des clients
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20',
  });
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const resend = resendApiKey ? new Resend(resendApiKey) : null;

  // 3. Récupération du body et de la signature
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('❌ Signature Stripe manquante');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  // 4. Validation de l'événement Stripe
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('✅ Événement Stripe validé:', event.type);
  } catch (err: any) {
    console.error('❌ Erreur validation signature:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // 5. Traitement des événements
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const userEmail = session.customer_details?.email || session.metadata?.supabase_user_email;
      const userId = session.client_reference_id || session.metadata?.supabase_user_id;

      console.log('📧 Email client:', userEmail);
      console.log('🆔 Customer ID:', customerId);
      console.log('👤 User ID:', userId);

      if (!userEmail) {
        console.error('❌ Email introuvable dans la session Stripe');
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // 6. Upsert du profil avec le client Admin (SERVICE_ROLE_KEY)
      const updateData = {
        email: userEmail,
        stripe_customer_id: customerId,
        subscription_tier: 'pro',
        plan: 'pro',
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      };

      console.log('📝 Tentative UPSERT avec:', updateData);

      const { data: upsertData, error: upsertError } = await supabase
        .from('profiles')
        .upsert(updateData, { onConflict: 'email' });

      if (upsertError) {
        console.error('❌ ERREUR UPSERT:', JSON.stringify(upsertError));
      } else {
        console.log('✅ Plan PRO activé pour:', userEmail);
        console.log('✅ Données:', upsertData);
      }

      // 7. Envoi de l'email de confirmation via Resend
      if (resend && !upsertError) {
        try {
          await resend.emails.send({
            from: 'ArtisScan <bienvenue@artisscan.fr>',
            to: [userEmail],
            subject: 'Accès ArtisScan activé !',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; border: 1px solid #e2e8f0; border-radius: 24px; text-align: center;">
                <div style="margin-bottom: 30px;">
                  <img src="https://artisscan.vercel.app/icon-rounded.svg" alt="ArtisScan" style="width: 80px; height: 80px;">
                </div>
                <h1 style="color: #1e293b; font-size: 28px; font-weight: 900; margin-bottom: 10px;">Accès ArtisScan activé !</h1>
                <p style="font-size: 18px; color: #64748b; line-height: 1.6; margin-bottom: 30px;">
                  Merci pour votre paiement. Votre compte est maintenant Pro.
                </p>
                
                <div style="background-color: #fff7ed; padding: 24px; border-radius: 20px; margin-bottom: 35px; border: 1px solid #ffedd5;">
                  <div style="display: grid; gap: 12px; text-align: left; color: #9a3412; font-weight: 700; font-size: 15px;">
                    <div>✅ Scans IA illimités</div>
                    <div>✅ Exports PDF / Excel / CSV</div>
                    <div>✅ Calcul de TVA automatique</div>
                    <div>✅ Support prioritaire 7j/7</div>
                  </div>
                </div>

                <a href="https://artisscan.vercel.app/dashboard" style="background-color: #f97316; color: white; padding: 18px 36px; text-decoration: none; border-radius: 16px; font-weight: 900; font-size: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(249, 115, 22, 0.3);">
                  Accéder à mon Dashboard
                </a>

                <p style="font-size: 12px; color: #94a3b8; margin-top: 50px; border-top: 1px solid #f1f5f9; padding-top: 25px;">
                  ArtisScan - La gestion intelligente pour les artisans.<br>
                  © 2024 ArtisScan.
                </p>
              </div>
            `
          });
          console.log('📧 Email de bienvenue envoyé à:', userEmail);
        } catch (emailErr: any) {
          console.error('❌ Erreur envoi email:', emailErr.message);
        }
      }
    }

    if (event.type === 'customer.subscription.deleted') {
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
      
      console.log('❌ Abonnement résilié pour:', customerId);
    }

    if (event.type === 'customer.subscription.updated') {
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
      
      console.log('ℹ️ Abonnement mis à jour:', status, 'pour:', customerId);
    }

    // 8. Réponse 200 impérative pour Stripe
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (err: any) {
    console.error('❌ Erreur traitement webhook:', err.message);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
