import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
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

async function updateProfileWithSubscription(
  supabaseAdmin: SupabaseClient<any>,
  supabaseUserId: string,
  subscription: Stripe.Subscription
) {
  const priceId = subscription.items.data[0]?.price?.id || null;
  const plan = planFromPriceId(priceId) || ((subscription.metadata?.billingCycle as Plan | undefined) ?? null);
  const active = subscription.status === 'active' || subscription.status === 'trialing';
  const currentPeriodEnd = (subscription as any)?.current_period_end as number | undefined;
  const endDate = currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null;
  const stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || null;

  // Idempotence simple pour éviter de spammer l’email sur les "subscription.updated"
  const { data: prevProfile } = await supabaseAdmin
    .from('profiles')
    .select('is_pro, subscription_status, stripe_subscription_id')
    .eq('id', supabaseUserId)
    .maybeSingle();

  const prevStatus = ((prevProfile as any)?.subscription_status || '').toString();
  const prevActive = !!(prevProfile as any)?.stripe_subscription_id && (prevStatus === 'active' || prevStatus === 'trialing');
  const prevSubId = (prevProfile as any)?.stripe_subscription_id || null;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({
      is_pro: active,
      plan: active ? plan : null,
      subscription_status: subscription.status,
      subscription_end_date: endDate,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: stripeCustomerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', supabaseUserId);

  console.log('✅ Supabase update result', {
    supabaseUserId,
    active,
    plan,
    endDate,
    stripeCustomerId,
    subscription_id: subscription.id,
    prevActive,
    prevSubId,
    data,
    error,
  });

  const shouldSendActivationEmail = active && !!endDate && (!prevActive || (prevSubId && prevSubId !== subscription.id));
  if (shouldSendActivationEmail) {
    try {
      await sendSubscriptionActivatedEmail(supabaseUserId);
      console.log('✅ Email envoyé', { supabaseUserId });
    } catch (err: any) {
      console.error('❌ Email erreur', err?.message || err);
    }
  }
}

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // 🔒 V1: forcer Stripe TEST
  if (stripeSecretKey.startsWith('sk_live_')) {
    console.error('⛔ Webhook: clé Stripe LIVE détectée (interdit en V1)');
    return NextResponse.json({ error: 'Stripe live interdit. Utilisez une clé sk_test.' }, { status: 500 });
  }

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
    const type = event.type;
    const obj = event.data.object as any;

    // 1) Checkout session completed
    if (type === 'checkout.session.completed') {
      const session = obj as Stripe.Checkout.Session;
      const supabaseUserId = session.metadata?.supabase_user_id || session.client_reference_id;
      if (!supabaseUserId) return NextResponse.json({ received: true });

      console.log('✅ checkout.session.completed', {
        session_id: session.id,
        supabaseUserId,
        subscription: session.subscription,
        customer: session.customer,
      });

      if (session.subscription) {
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.toString();
        try {
          const subscription = await stripe.subscriptions.retrieve(subId, { expand: ['items.data.price'] });
          await updateProfileWithSubscription(supabaseAdmin, supabaseUserId, subscription);
        } catch (err: any) {
          console.error('❌ Erreur récupération subscription après checkout', err?.message || err);
        }
      } else {
        console.log('ℹ️ checkout.session.completed sans subscription (null) → log-only', { session_id: session.id, supabaseUserId });
      }
    }

    // 2) Subscription events (source de vérité)
    if (type === 'customer.subscription.created' || type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
      const subscription = obj as Stripe.Subscription;
      const supabaseUserId = subscription.metadata?.supabase_user_id;
      if (!supabaseUserId) {
        console.warn('⚠️ subscription event sans supabase_user_id', { type, subscription_id: subscription.id });
        return NextResponse.json({ received: true });
      }

      console.log('🔁 subscription event', { type, supabaseUserId, subscription_id: subscription.id, status: subscription.status });
      await updateProfileWithSubscription(supabaseAdmin, supabaseUserId, subscription);
    }
  } catch (err: any) {
    console.error('❌ Webhook handler error', err?.message);
    return NextResponse.json({ error: 'Webhook error', detail: err?.message || err }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}


