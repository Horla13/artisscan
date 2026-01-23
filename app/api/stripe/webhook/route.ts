import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendMail } from '@/lib/sendMail';

type Plan = 'monthly' | 'yearly';

function planFromPriceId(priceId: string | null | undefined): Plan | null {
  const monthly = process.env.STRIPE_PRICE_ID_MONTHLY;
  const yearly = process.env.STRIPE_PRICE_ID_YEARLY;
  if (!priceId || !monthly || !yearly) return null;
  if (priceId === monthly) return 'monthly';
  if (priceId === yearly) return 'yearly';
  return null;
}

async function sendSubscriptionActivatedEmail(supabaseUserId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(supabaseUserId);
  if (error) throw new Error(error.message);
  const email = data?.user?.email;
  if (!email) throw new Error('Email introuvable');

  const subject = 'Bienvenue sur ArtisScan Pro';
  const html = `
    Bonjour,<br/><br/>
    Votre abonnement ArtisScan est désormais actif.<br/>
    Vous pouvez dès maintenant :<br/>
    - scanner vos factures et justificatifs<br/>
    - exporter des CSV prêts pour votre comptable<br/>
    - envoyer directement les documents à votre cabinet<br/><br/>
    👉 Accéder à votre espace : https://www.artisscan.fr/dashboard<br/><br/>
    Merci de votre confiance,<br/>
    L’équipe ArtisScan<br/>
    Vertex Labs
  `;

  console.log('📧 Envoi email abonnement activé', { to: email, user_id: supabaseUserId });
  return await sendMail({ to: email, subject, html });
}

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
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const supabaseUserId = session.metadata?.supabase_user_id || session.client_reference_id;
      if (!supabaseUserId) return NextResponse.json({ received: true });

      console.log('✅ Checkout session reçu', {
        session_id: session.id,
        supabaseUserId,
        subscription: session.subscription,
      });

      // ✅ Ne rien faire si Stripe ne fournit pas (encore) la subscription ici
      const subId =
        typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription as any)?.id || null;
      if (!subId) {
        console.log('ℹ️ Session sans subscription (null) → pas de mise à jour Supabase', { session_id: session.id, supabaseUserId });
        return NextResponse.json({ received: true });
      }

      const subscription = (await stripe.subscriptions.retrieve(subId, { expand: ['items.data.price'] })) as any as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price?.id || null;
      const plan = planFromPriceId(priceId) || ((subscription.metadata?.billingCycle as Plan | undefined) ?? null);
      const active = subscription.status === 'active' || subscription.status === 'trialing';
      const endDate = (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : null;
      const stripeCustomerId =
        typeof (subscription as any).customer === 'string'
          ? ((subscription as any).customer as string)
          : ((subscription as any).customer?.id as string | undefined) || (session.customer?.toString() ?? null);

      await supabaseAdmin
        .from('profiles')
        .update({
          is_pro: active,
          plan: active ? plan : null,
          subscription_status: subscription.status,
          subscription_end_date: endDate,
          stripe_subscription_id: subId,
          stripe_customer_id: stripeCustomerId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', supabaseUserId);

      console.log('✅ Supabase updated PRO status', { supabaseUserId, plan, active, endDate, subId, stripeCustomerId });

      if (active && endDate) {
        try {
          await sendSubscriptionActivatedEmail(supabaseUserId);
          console.log('✅ Email envoyé', { supabaseUserId });
        } catch (err: any) {
          console.error('❌ Email erreur', err?.message || err);
        }
      }
    } else {
      console.log('ℹ️ Event ignoré', event.type);
    }
  } catch (err: any) {
    console.error('❌ Webhook handler error', err?.message);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}


