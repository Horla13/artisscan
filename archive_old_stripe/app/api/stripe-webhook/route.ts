// @ts-nocheck
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export async function POST(req: Request) {
  console.log('🔔 RECU DANS WEBHOOK - DEBUT');
  
  // 1. Création du client Supabase avec SERVICE_ROLE_KEY dès le début
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey || !stripeWebhookSecret) {
    console.error('❌ Variables Supabase manquantes');
    return NextResponse.json({ received: true, error: 'Config missing' }, { status: 500 });
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  console.log('✅ Client Supabase Admin créé');
  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });
  
  try {
    // 2. Vérification de signature Stripe (OBLIGATOIRE en prod)
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('❌ stripe-signature manquante');
      return NextResponse.json({ received: true, error: 'Missing signature' }, { status: 400 });
    }

    const rawBody = await req.text();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
    } catch (err: any) {
      console.error('❌ Signature Stripe invalide:', err?.message);
      return NextResponse.json({ received: true, error: 'Invalid signature' }, { status: 400 });
    }

    console.log('📋 Type événement:', event.type);
    
    // 3. Traitement de l'événement checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      console.log('✅ Événement checkout.session.completed détecté');
      
      const session = event.data.object as Stripe.Checkout.Session;
      const userEmail = session.customer_details?.email || session.customer_email || '';
      const customerId = (session.customer as string) || '';
      const userId =
        (session.metadata?.supabase_user_id || '').trim() ||
        (session.client_reference_id || '').toString().trim();
      
      console.log('📧 Email client reçu:', userEmail);
      console.log('🆔 Customer ID:', customerId);
      console.log('🆔 Supabase user_id (metadata):', userId);
      
      if (!userId) {
        console.error('❌ Impossible de déterminer le user_id Supabase (metadata + client_reference_id vides)');
        return NextResponse.json({ received: true, error: 'Missing supabase_user_id' }, { status: 200 });
      }
      
      // 4. Update par user_id (fiable) : is_pro + plan + statut
      console.log('📝 Activation PRO pour user_id:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: userEmail || null,
          is_pro: true,
          plan: 'pro',
          subscription_tier: 'pro',
          subscription_status: 'active',
          stripe_customer_id: customerId || null,
          updated_at: new Date().toISOString(),
        })
        .select();
      
      if (error) {
        console.error('❌ ERREUR UPDATE:', JSON.stringify(error));
        console.error('Code erreur:', error.code);
        console.error('Details:', error.details);
        console.error('Message:', error.message);
        return NextResponse.json({ received: true, error: error.message }, { status: 200 });
      }
      
      console.log('🎉 SUCCÈS: Plan PRO activé pour:', userEmail);
      console.log('✅ Lignes modifiées:', data?.length || 0);
      console.log('✅ Données retournées:', data);
      
      // NOTE: Ancienne version archivée : l’envoi d’email (ancien provider) a été retiré du dépôt.
    }
    
    // 5. Réponse 200 obligatoire pour Stripe
    console.log('✅ Webhook traité avec succès');
    return NextResponse.json({ received: true }, { status: 200 });
    
  } catch (err: any) {
    console.error('❌ ERREUR GLOBALE:', err.message);
    console.error('Stack:', err.stack);
    return NextResponse.json({ received: true, error: err.message }, { status: 200 });
  }
}

