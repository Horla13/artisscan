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

async function updateProfile(params: {
  supabaseUserId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: Plan | null;
  isPro: boolean;
  subscriptionStatus?: string | null;
  endDateIso?: string | null;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase config manquante');
  }
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // Lire l'état actuel (utile pour éviter des emails dupliqués en cas de retry webhook)
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('is_pro, stripe_subscription_id')
    .eq('id', params.supabaseUserId)
    .maybeSingle();

  const alreadyProSameSub =
    existingProfile?.is_pro === true &&
    !!existingProfile?.stripe_subscription_id &&
    existingProfile?.stripe_subscription_id === params.stripeSubscriptionId &&
    params.isPro === true;

  console.log('🗄️ Supabase update profiles', {
    id: params.supabaseUserId,
    stripe_customer_id: params.stripeCustomerId,
    stripe_subscription_id: params.stripeSubscriptionId,
    plan: params.plan,
    is_pro: params.isPro,
    subscription_status: params.subscriptionStatus,
    subscription_end_date: params.endDateIso,
  });

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      stripe_customer_id: params.stripeCustomerId,
      stripe_subscription_id: params.stripeSubscriptionId,
      plan: params.plan,
      is_pro: params.isPro,
      subscription_status: params.subscriptionStatus ?? null,
      // compat: on remplit les 2 colonnes (ancienne + nouvelle)
      end_date: params.endDateIso ?? null,
      subscription_end_date: params.endDateIso ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.supabaseUserId);

  if (error) {
    // Fallback si les colonnes subscription_status/end_date n'existent pas encore en DB
    const msg = String(error.message || '');
    if (msg.includes('subscription_status') || msg.includes('end_date') || msg.includes('subscription_end_date') || error.code === '42703') {
      console.warn('⚠️ Colonnes abonnement manquantes en DB, retry update sans subscription_status/end_date/subscription_end_date');
      const { error: retryErr } = await supabaseAdmin
        .from('profiles')
        .update({
          stripe_customer_id: params.stripeCustomerId,
          stripe_subscription_id: params.stripeSubscriptionId,
          plan: params.plan,
          is_pro: params.isPro,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.supabaseUserId);
      if (retryErr) {
        console.error('❌ Supabase update error (retry)', retryErr);
        throw new Error(retryErr.message);
      }
      return { alreadyProSameSub };
    }
    console.error('❌ Supabase update error', error);
    throw new Error(error.message);
  }

  return { alreadyProSameSub };
}

async function sendSubscriptionActivatedEmail(params: { supabaseUserId: string }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase config manquante');
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(params.supabaseUserId);
  if (error) throw new Error(error.message);
  const email = data?.user?.email;
  if (!email) throw new Error('Email utilisateur introuvable');

  // ✅ Contenu EXACT demandé (wodring inchangé)
  const subject = 'Bienvenue sur ArtisScan Pro';
  const html = [
    'Bonjour,',
    '',
    'Votre abonnement ArtisScan est désormais actif.',
    '',
    'Vous pouvez dès maintenant :',
    '- scanner vos factures et justificatifs',
    '- exporter des CSV prêts pour votre comptable',
    '- envoyer directement les documents à votre cabinet',
    '',
    '👉 Accéder à votre espace : https://www.artisscan.fr/dashboard',
    '',
    'Merci de votre confiance,',
    'L’équipe ArtisScan',
    'Vertex Labs',
  ].join('<br/>');

  console.log('📧 Email abonnement activé: envoi', { to: email, user_id: params.supabaseUserId });
  return await sendMail({ to: email, subject, html });
}

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecretKey || !webhookSecret) {
    console.error('❌ Webhook: config Stripe manquante');
    return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 });
  }
  // 🔒 Interdire Stripe Live (V1 = test mode uniquement)
  if (stripeSecretKey.startsWith('sk_live_')) {
    console.error('⛔ Webhook: clé Stripe LIVE détectée (interdit en V1)');
    return NextResponse.json({ error: 'Stripe live interdit. Utilisez une clé sk_test.' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-12-15.clover' });

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    console.error('❌ Webhook: stripe-signature manquante');
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error('❌ Webhook: signature invalide', err?.message);
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  console.log('🔔 Webhook reçu', { type: event.type, id: event.id, livemode: (event as any).livemode });

  // 🔒 Refuser les events live (sécurité V1)
  if ((event as any).livemode === true) {
    console.error('⛔ Webhook: event livemode reçu (refusé)', { id: event.id, type: event.type });
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('✅ checkout.session.completed', {
          session_id: session.id,
          subscription: session.subscription,
          customer: session.customer,
        });

        const supabaseUserId =
          (session.metadata?.supabase_user_id as string | undefined) ||
          (session.client_reference_id as string | undefined);

        if (!supabaseUserId) {
          console.warn('⚠️ Webhook checkout.session.completed sans supabase_user_id');
          break;
        }

        const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
        const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || null;

        if (!stripeSubscriptionId) {
          console.warn('⚠️ Webhook checkout.session.completed sans subscription id', { supabaseUserId });
          break;
        }

        const sub = (await stripe.subscriptions.retrieve(stripeSubscriptionId, { expand: ['items.data.price'] })) as any as Stripe.Subscription;
        const status = sub.status;
        const active = status === 'active' || status === 'trialing';
        const priceId = sub.items.data[0]?.price?.id;
        const plan = planFromPriceId(priceId) || ((sub.metadata?.billingCycle as Plan | undefined) ?? null);
        const endDateIso = (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000).toISOString() : null;
        console.log('📌 Subscription Stripe', {
          subscription_id: stripeSubscriptionId,
          status,
          current_period_end: (sub as any).current_period_end || null,
          endDateIso,
        });

        const { alreadyProSameSub } = await updateProfile({
          supabaseUserId,
          stripeCustomerId,
          stripeSubscriptionId,
          plan: active ? plan : null,
          isPro: active,
          subscriptionStatus: status,
          endDateIso,
        });

        // Email "Abonnement activé" UNIQUEMENT après checkout.session.completed confirmé
        if (active && !alreadyProSameSub) {
          try {
            const res = await sendSubscriptionActivatedEmail({ supabaseUserId });
            console.log('✅ Email abonnement activé: envoyé', { supabaseUserId, res });
          } catch (err: any) {
            // ne pas bloquer le webhook
            console.error('❌ Email abonnement activé: erreur envoi', err?.message || err);
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;

        const supabaseUserId = (sub.metadata?.supabase_user_id as string | undefined) || null;
        if (!supabaseUserId) {
          console.warn('⚠️ Webhook subscription sans metadata.supabase_user_id', { subId: sub.id });
          break;
        }

        const stripeCustomerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || null;
        const stripeSubscriptionId = sub.id;

        const status = sub.status;
        const active = status === 'active' || status === 'trialing';
        const priceId = sub.items.data[0]?.price?.id;
        const plan = planFromPriceId(priceId) || ((sub.metadata?.billingCycle as Plan | undefined) ?? null);
        const endDateIso = (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000).toISOString() : null;

        await updateProfile({
          supabaseUserId,
          stripeCustomerId,
          stripeSubscriptionId: active ? stripeSubscriptionId : null,
          plan: active ? plan : null,
          isPro: active,
          subscriptionStatus: status,
          endDateIso: active ? endDateIso : null,
        });
        break;
      }
      default:
        // ignore
        break;
    }
  } catch (err: any) {
    console.error('❌ Webhook handler error', err?.message || err);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}


