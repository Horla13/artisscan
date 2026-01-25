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

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // On privilégie le Bearer token (si session dispo), mais on supporte un fallback signup
  // quand Supabase ne renvoie pas de session immédiatement après signUp.
  let userEmail: string | null = null;
  let userId: string | null = null;

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length);
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user?.email) {
      console.warn('⛔ /api/emails/account-created: token invalide', userErr?.message);
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
    }
    userEmail = user.email;
    userId = user.id;
  } else {
    const body = await req.json().catch(() => ({}));
    const fallbackUserId = (body?.userId || body?.user_id || '').toString().trim();
    if (!fallbackUserId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    // ✅ Fallback contrôlé: userId doit exister et être récent
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(fallbackUserId);
    if (error || !data?.user?.email) {
      console.warn('⛔ /api/emails/account-created: userId invalide', error?.message);
      return NextResponse.json({ error: 'User invalide' }, { status: 400 });
    }
    const createdAt = data.user.created_at ? new Date(data.user.created_at) : null;
    if (!createdAt || isNaN(createdAt.getTime())) {
      return NextResponse.json({ error: 'User invalide' }, { status: 400 });
    }
    const ageMs = Date.now() - createdAt.getTime();
    if (ageMs > 15 * 60 * 1000) {
      // anti-abus simple: uniquement pour un signup récent
      return NextResponse.json({ ok: true, skipped: true });
    }
    // Ne pas envoyer si déjà Pro (sécurité)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_pro')
      .eq('id', fallbackUserId)
      .maybeSingle();
    if (profile?.is_pro === true) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    userEmail = data.user.email;
    userId = data.user.id;
  }

  const siteUrl =
    (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.artisscan.fr').toString().replace(/\/$/, '');
  const logoUrl = `${siteUrl}/logo-email.png`;

  // CTA autorisé sur l’email “bienvenue”
  const ctaUrl = `${siteUrl}/login?redirect=/dashboard`;

  const brand = '#FF6600';
  const bg = '#F8FAFC';
  const cardBorder = '#E2E8F0';
  const text = '#111827';
  const muted = '#334155';

  const subject = 'Bienvenue sur ArtisScan';
  const html = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bienvenue sur ArtisScan</title>
  </head>
  <body style="margin:0;padding:0;background:${bg};font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${bg};">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">
            <!-- Header -->
            <tr>
              <td style="padding:8px 6px 18px 6px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td align="left" style="vertical-align:middle;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="vertical-align:middle;padding-right:10px;">
                            <img src="${logoUrl}" width="36" height="36" alt="ArtisScan" style="display:block;border:0;outline:none;text-decoration:none;border-radius:10px;" />
                          </td>
                          <td style="vertical-align:middle;">
                            <div style="font-size:14px;font-weight:800;color:${text};line-height:18px;">ArtisScan</div>
                            <div style="font-size:12px;color:${muted};line-height:16px;">Bienvenue</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <div style="font-size:12px;color:${muted};line-height:16px;">${new Date().toLocaleDateString('fr-FR')}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Carte -->
            <tr>
              <td style="background:#FFFFFF;border:1px solid ${cardBorder};border-radius:18px;box-shadow:0 10px 30px rgba(15,23,42,0.06);overflow:hidden;">
                <div style="height:10px;background:${brand};line-height:10px;font-size:10px;">&nbsp;</div>

                <div style="padding:28px 26px 14px 26px;">
                  <div style="font-size:20px;font-weight:800;color:${brand};line-height:28px;">Bienvenue sur ArtisScan</div>
                  <div style="margin-top:10px;font-size:14px;color:${muted};line-height:22px;">
                    Votre compte ArtisScan a été créé avec succès.
                    <br />
                    Vous pouvez désormais scanner vos factures et gérer votre comptabilité simplement.
                  </div>
                </div>

                <!-- CTA -->
                <div style="padding:6px 26px 6px 26px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding:8px 0 14px 0;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            <td bgcolor="${brand}" style="border-radius:14px;">
                              <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer"
                                style="display:inline-block;background:${brand};color:#FFFFFF;text-decoration:none;font-weight:800;font-size:14px;line-height:18px;padding:14px 22px;border-radius:14px;">
                                Accéder à mon compte
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- Ce que vous pouvez faire -->
                <div style="padding:0 26px 0 26px;">
                  <div style="background:#F1F5F9;border:1px solid ${cardBorder};border-left:4px solid ${brand};border-radius:14px;padding:16px;">
                    <div style="font-size:13px;font-weight:800;color:${text};margin-bottom:10px;">Ce que vous pouvez faire</div>
                    <div style="font-size:13px;color:${muted};line-height:20px;">
                      <div style="margin:6px 0;">- Scanner des factures (photo ou PDF)</div>
                      <div style="margin:6px 0;">- Extraire automatiquement les montants HT / TVA / TTC</div>
                      <div style="margin:6px 0;">- Exporter vers votre comptable (CSV / FEC / PDF)</div>
                    </div>
                  </div>
                </div>

                <!-- Footer carte -->
                <div style="padding:18px 26px 22px 26px;">
                  <div style="border-top:1px solid ${brand};padding-top:14px;">
                    <div style="font-size:12px;color:${muted};line-height:18px;">
                      Email envoyé via ArtisScan – Solution de gestion comptable pour artisans.
                      <br />
                      www.artisscan.fr
                    </div>
                  </div>
                </div>
              </td>
            </tr>

            <!-- footer extérieur -->
            <tr>
              <td align="center" style="padding:16px 6px 0 6px;">
                <div style="font-size:11px;color:#94A3B8;line-height:16px;">
                  Besoin d’aide ? contact@artisscan.fr
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  console.log('📧 Email compte créé: envoi', { to: userEmail, user_id: userId });
  try {
    const res = await sendMail({ to: userEmail!, subject, html });
    console.log('✅ Email compte créé: envoyé', { to: userEmail, res });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // Ne pas bloquer le flow utilisateur: on log et on retourne OK.
    console.error('❌ Email compte créé: erreur envoi', err?.message || err);
    return NextResponse.json({ ok: true, warned: true });
  }
}


