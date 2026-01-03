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
        const userEmail = session.customer_details?.email || session.metadata?.supabase_user_email || undefined;
        const userId = session.metadata?.supabase_user_id || clientReferenceId;

        // Mise à jour ou Création forcée du profil (Bulldozer mode)
        if (userId || userEmail) {
          // Si on a l'ID, on update par ID, sinon on cherche par email (ou on crée)
          const updateData = {
            stripe_customer_id: customerId,
            subscription_tier: 'pro',
            plan: 'pro',
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          };

          if (userId) {
            await supabase.from('profiles').update(updateData).eq('id', userId);
            console.log(`✅ Profil mis à jour via ID pour ${userId}`);
          } else if (userEmail) {
            // Tentative de mise à jour par email si l'ID est absent (Guest Checkout)
            await supabase.from('profiles').update(updateData).eq('email', userEmail);
            console.log(`✅ Profil mis à jour via Email pour ${userEmail}`);
          }
          
          // Envoi de l'email de bienvenue via Resend
          if (resend && userEmail) {
            try {
              await resend.emails.send({
                from: 'ArtisScan <bienvenue@artisscan.fr>',
                to: [userEmail],
                subject: 'Bienvenue chez ArtisScan ! Votre accès Pro est activé',
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; border: 1px solid #e2e8f0; border-radius: 24px; text-align: center;">
                    <div style="margin-bottom: 30px;">
                      <img src="https://artisscan.vercel.app/icon-rounded.svg" alt="ArtisScan" style="width: 80px; height: 80px;">
                    </div>
                    <h1 style="color: #1e293b; font-size: 28px; font-weight: 900; margin-bottom: 10px; tracking-tight: -0.025em;">Votre accès Pro est activé !</h1>
                    <p style="font-size: 18px; color: #64748b; line-height: 1.6; margin-bottom: 30px;">
                      Merci pour votre confiance. Cliquez sur le bouton ci-dessous pour vous connecter et accéder à votre dashboard.
                    </p>
                    
                    <div style="background-color: #fff7ed; padding: 24px; border-radius: 20px; margin-bottom: 35px; border: 1px solid #ffedd5;">
                      <div style="display: grid; gap: 12px; text-align: left; color: #9a3412; font-weight: 700; font-size: 15px;">
                        <div style="margin-bottom: 8px;">✅ Scans IA illimités</div>
                        <div style="margin-bottom: 8px;">✅ Exports PDF / Excel / CSV</div>
                        <div style="margin-bottom: 8px;">✅ Calcul de TVA automatique</div>
                        <div>✅ Support prioritaire 7j/7</div>
                      </div>
                    </div>

                    <a href="https://artisscan.vercel.app/login" style="background-color: #f97316; color: white; padding: 18px 36px; text-decoration: none; border-radius: 16px; font-weight: 900; font-size: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(249, 115, 22, 0.3);">
                      Se connecter
                    </a>

                    <p style="font-size: 12px; color: #94a3b8; margin-top: 50px; border-top: 1px solid #f1f5f9; padding-top: 25px;">
                      ArtisScan - La gestion intelligente universelle pour les artisans.<br>
                      © 2024 ArtisScan.
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

