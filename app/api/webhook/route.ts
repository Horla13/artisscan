import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error('❌ Variables d\'environnement manquantes pour le Webhook');
    return NextResponse.json({ error: 'Config error' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20',
  });

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const resend = resendApiKey ? new Resend(resendApiKey) : null;

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
        const clientReferenceId = session.client_reference_id;
        const userEmail = session.customer_details?.email;
        const userId = session.metadata?.supabase_user_id || clientReferenceId;

        if (userId) {
          await supabase
            .from('profiles')
            .update({
              stripe_customer_id: customerId,
              subscription_tier: 'pro',
              plan: 'pro',
              subscription_status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
          
          console.log(`✅ Profil mis à jour (Abonnement PRO) pour ${userId}`);

          // Envoi de l'email de bienvenue via Resend
          if (resend && userEmail) {
            try {
              await resend.emails.send({
                from: 'ArtisScan <bienvenue@artisscan.fr>',
                to: [userEmail],
                subject: '🚀 Bienvenue sur ArtisScan PRO !',
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
                    <h1 style="color: #f97316; text-align: center;">Félicitations !</h1>
                    <p style="font-size: 16px; color: #1e293b; line-height: 1.6;">
                      Bonjour, <br><br>
                      Votre abonnement <strong>ArtisScan PRO</strong> est maintenant actif. Vous avez désormais accès à tous nos outils de gestion intelligente pour simplifier votre comptabilité.
                    </p>
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 25px 0;">
                      <ul style="list-style: none; padding: 0; margin: 0; color: #475569; font-size: 14px;">
                        <li style="margin-bottom: 10px;">✅ Scans illimités (IA)</li>
                        <li style="margin-bottom: 10px;">✅ Exports PDF / Excel / CSV illimités</li>
                        <li style="margin-bottom: 10px;">✅ Calcul de TVA automatique</li>
                        <li style="margin-bottom: 10px;">✅ Support prioritaire 7j/7</li>
                      </ul>
                    </div>
                    <div style="text-align: center; margin-top: 30px;">
                      <a href="https://artisscan.vercel.app/dashboard" style="background-color: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Accéder à mon Dashboard
                      </a>
                    </div>
                    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                      ArtisScan - La gestion intelligente universelle pour les artisans.<br>
                      © 2024 ArtisScan. Tous droits réservés.
                    </p>
                  </div>
                `
              });
              console.log(`📧 Email de bienvenue envoyé à ${userEmail}`);
            } catch (emailErr) {
              console.error('❌ Erreur lors de l\'envoi de l\'email:', emailErr);
            }
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

