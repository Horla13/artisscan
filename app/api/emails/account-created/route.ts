import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendMail } from '@/lib/sendMail';

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ /api/emails/account-created: config Supabase manquante');
    return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const token = authHeader.slice('Bearer '.length);
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !user?.email) {
    console.warn('⛔ /api/emails/account-created: token invalide', userErr?.message);
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
  }

  // ⚠️ Lien EXACT demandé (ne pas modifier)
  const pricingUrl = 'https://www.artisscan.fr/pricing';

  // ✅ Contenu EXACT demandé (wodring inchangé)
  const subject = 'Votre compte ArtisScan est créé';
  const html = [
    'Bonjour,',
    '',
    'Votre compte ArtisScan a bien été créé.',
    '',
    'Pour accéder aux fonctionnalités complètes (scan intelligent, exports comptables CSV et FEC), il vous suffit maintenant de finaliser votre abonnement.',
    '',
    `👉 Finaliser mon abonnement : ${pricingUrl}`,
    '',
    'Si vous avez la moindre question, vous pouvez répondre directement à cet email.',
    '',
    'Bien cordialement,',
    'L’équipe ArtisScan',
    'Vertex Labs',
  ].join('<br/>');

  console.log('📧 Email compte créé: envoi', { to: user.email, user_id: user.id });
  try {
    const res = await sendMail({ to: user.email, subject, html });
    console.log('✅ Email compte créé: envoyé', { to: user.email, res });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // Ne pas bloquer le flow utilisateur: on log et on retourne OK.
    console.error('❌ Email compte créé: erreur envoi', err?.message || err);
    return NextResponse.json({ ok: true, warned: true });
  }
}


