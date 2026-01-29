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

async function sendSubscriptionActivatedEmail(supabaseAdmin: SupabaseClient<any>, supabaseUserId: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(supabaseUserId);
    if (error) {
      console.warn('⚠️ Email: getUserById error', { supabaseUserId, error: error.message });
      return;
    }
    const email = data?.user?.email;
    if (!email) {
      console.warn('⚠️ Email: email introuvable', { supabaseUserId });
      return;
    }

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

    console.log('📧 Email abonnement activé: envoi', { to: email, user_id: supabaseUserId });
    await sendMail({ to: email, subject, html });
    console.log('✅ Email abonnement activé: envoyé', { supabaseUserId });
  } catch (err: any) {
    console.error('❌ Email abonnement activé: erreur', err?.message || err);
  }
}

async function updateProfileWithSubscription(
  supabaseAdmin: SupabaseClient<any>,
  supabaseUserId: string,
  subscription: Stripe.Subscription
) {
  const status = (subscription?.status || '').toString();
  const entitled = status === 'active' || status === 'trialing';

  // Plan (best effort)
  const priceId = subscription?.items?.data?.[0]?.price?.id || null;
  const plan: Plan | null = planFromPriceId(priceId);

  // Customer id (best effort)
  const stripeCustomerId =
    typeof (subscription as any)?.customer === 'string'
      ? ((subscription as any).customer as string)
      : ((subscription as any)?.customer?.id as string | undefined) || null;

  // Garde-fou email minimal (V1):
  // - envoyer uniquement si profile.is_pro passe de false -> true
  // - ET la mise à jour Supabase a réussi
  let prevIsPro = false;
  try {
    const { data: prevProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_pro')
      .eq('id', supabaseUserId)
      .maybeSingle();
    prevIsPro = (prevProfile as any)?.is_pro === true;
  } catch (e) {
    console.warn('⚠️ Webhook: impossible de lire prev is_pro', { supabaseUserId, e });
  }

  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        is_pro: entitled,
        plan: entitled ? plan : null,
        subscription_status: status || null,
        stripe_subscription_id: subscription?.id || null,
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', supabaseUserId);

    if (error) {
      console.error('❌ Supabase update error', { supabaseUserId, error: error.message });
    } else {
      console.log('✅ Supabase updated', {
        supabaseUserId,
        entitled,
        status,
        plan,
        stripe_subscription_id: subscription?.id,
        stripe_customer_id: stripeCustomerId,
      });

      // Email UNIQUEMENT si ACTIVE + transition is_pro false -> true
      const shouldSendEmail = status === 'active' && prevIsPro === false && entitled === true;
      if (shouldSendEmail) {
        await sendSubscriptionActivatedEmail(supabaseAdmin, supabaseUserId);
      }
    }
  } catch (e: any) {
    console.error('❌ Supabase update threw', { supabaseUserId, message: e?.message || e });
  }
}

async function resolveSupabaseUserIdFromCustomerId(
  supabaseAdmin: SupabaseClient<any>,
  stripeCustomerId: string | null
): Promise<string | null> {
  if (!stripeCustomerId) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', stripeCustomerId)
      .maybeSingle();
    if (error) {
      console.warn('⚠️ Webhook: lookup user_id via stripe_customer_id a échoué', { stripeCustomerId, error: error.message });
      return null;
    }
    return (data as any)?.id || null;
  } catch (e: any) {
    console.warn('⚠️ Webhook: exception lookup user_id via stripe_customer_id', { stripeCustomerId, message: e?.message || e });
    return null;
  }
}

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error('❌ Webhook Stripe: configuration manquante', {
      hasStripeSecretKey: Boolean(stripeSecretKey),
      hasWebhookSecret: Boolean(webhookSecret),
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
    });
    // Stripe attend un 2xx; on loggue et on sort proprement.
    return NextResponse.json({ received: true, warned: true });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // Live OK: on évite tout blocage côté webhook (Stripe exige un 2xx).

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

  // ✅ Log demandé (utile en prod pour diagnostiquer la sync Live → Supabase)
  console.log('🔥 Stripe webhook received', event.type);
  console.log('🔎 Stripe webhook meta', { id: event.id, livemode: event.livemode, type: event.type });

  // Stripe LIVE uniquement (sécurité)
  if (event.livemode !== true) {
    console.warn('⚠️ Webhook: event non-live ignoré', { id: event.id, type: event.type, livemode: event.livemode });
    return NextResponse.json({ received: true });
  }

  try {
    const type = event.type;
    const obj = event.data.object as any;

    // 1) Checkout session completed
    if (type === 'checkout.session.completed') {
      const session = obj as Stripe.Checkout.Session;
      const supabaseUserId = session.metadata?.supabase_user_id || session.client_reference_id;
      if (!supabaseUserId) {
        console.warn('⚠️ checkout.session.completed sans supabase_user_id', { session_id: session.id });
        return NextResponse.json({ received: true });
      }

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
          // Prefer metadata mapping on subscription events, but checkout can still update immediately.
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
      let supabaseUserId: string | null = (subscription as any)?.metadata?.supabase_user_id || null;
      if (!supabaseUserId) {
        // Fallback automatique (sans schéma) : mapper via stripe_customer_id déjà stocké dans profiles
        const stripeCustomerId =
          typeof (subscription as any)?.customer === 'string'
            ? ((subscription as any).customer as string)
            : ((subscription as any)?.customer?.id as string | undefined) || null;
        supabaseUserId = await resolveSupabaseUserIdFromCustomerId(supabaseAdmin, stripeCustomerId);
      }
      if (!supabaseUserId) {
        console.warn('⚠️ subscription event: mapping user introuvable', { type, subscription_id: subscription.id });
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


