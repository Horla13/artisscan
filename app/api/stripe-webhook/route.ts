import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function POST(req: Request) {
  console.log('🔔 RECU DANS WEBHOOK - DEBUT');
  
  // 1. Création du client Supabase avec SERVICE_ROLE_KEY dès le début
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Variables Supabase manquantes');
    return NextResponse.json({ received: true, error: 'Config missing' }, { status: 500 });
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  console.log('✅ Client Supabase Admin créé');
  
  try {
    // 2. Récupération du body (sans validation de signature pour test)
    const body = await req.json();
    console.log('📦 Body reçu:', JSON.stringify(body, null, 2));
    
    const event = body;
    console.log('📋 Type événement:', event.type);
    
    // 3. Traitement de l'événement checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      console.log('✅ Événement checkout.session.completed détecté');
      
      const session = event.data.object;
      const userEmail = session.customer_details?.email || session.customer_email;
      const customerId = session.customer;
      
      console.log('📧 Email client reçu:', userEmail);
      console.log('📧 Type:', typeof userEmail);
      console.log('📧 Longueur:', userEmail?.length);
      console.log('🆔 Customer ID:', customerId);
      
      if (!userEmail) {
        console.error('❌ Pas d\'email trouvé dans la session');
        return NextResponse.json({ received: true, error: 'No email' }, { status: 200 });
      }
      
      // 4. Récupération de l'utilisateur via son email dans auth.users
      console.log('🔍 Recherche utilisateur par email:', userEmail);
      const { data: { users }, error: searchError } = await supabase.auth.admin.listUsers();
      
      if (searchError) {
        console.error('❌ Erreur recherche utilisateur:', searchError);
        return NextResponse.json({ received: true, error: searchError.message }, { status: 200 });
      }
      
      const user = users.find(u => u.email === userEmail);
      
      if (!user) {
        console.error('❌ Utilisateur non trouvé pour email:', userEmail);
        console.log('👥 Utilisateurs trouvés:', users.map(u => u.email));
        return NextResponse.json({ received: true, error: 'User not found' }, { status: 200 });
      }
      
      console.log('✅ Utilisateur trouvé - ID:', user.id);
      
      // 5. Update ultra-simple : is_pro = true + plan = 'pro'
      console.log('📝 Tentative UPDATE is_pro = true + plan = pro pour email:', userEmail);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          is_pro: true,
          plan: 'pro',
          updated_at: new Date().toISOString()
        })
        .eq('email', userEmail)
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
      
      // 6. Envoi de l'email de bienvenue via Resend
      const resendApiKey = process.env.RESEND_API_KEY;
      
      if (resendApiKey) {
        try {
          const resend = new Resend(resendApiKey);
          console.log('📧 Envoi de l\'email de bienvenue à:', userEmail);
          
          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Bienvenue sur ArtisScan Pro</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
              <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                
                <!-- Logo ArtisScan -->
                <div style="text-align: center; margin-bottom: 40px;">
                  <div style="display: inline-block; padding: 20px 32px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(249, 115, 22, 0.4);">
                    <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 900; letter-spacing: -1px;">ArtisScan</h1>
                  </div>
                  <p style="color: #64748b; font-size: 12px; font-weight: 600; letter-spacing: 3px; margin-top: 12px; text-transform: uppercase;">Gestion Intelligente</p>
                </div>

                <!-- Carte principale -->
                <div style="background: white; border-radius: 24px; padding: 48px 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
                  
                  <!-- Titre avec emoji -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🚀</div>
                    <h2 style="margin: 0 0 12px 0; color: #1e293b; font-size: 28px; font-weight: 900; line-height: 1.2;">
                      Bienvenue sur votre Dashboard ArtisScan Pro !
                    </h2>
                    <p style="margin: 0; color: #64748b; font-size: 16px; line-height: 1.6;">
                      Votre paiement est confirmé 🎉
                    </p>
                  </div>

                  <!-- Message principal -->
                  <div style="margin: 32px 0; padding: 24px; background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border-radius: 16px; border-left: 4px solid #f97316;">
                    <p style="margin: 0 0 16px 0; color: #1e293b; font-size: 16px; line-height: 1.8; font-weight: 500;">
                      Félicitations ! Votre compte <strong style="color: #f97316;">ArtisScan Pro</strong> est maintenant actif.
                    </p>
                    <p style="margin: 0; color: #475569; font-size: 15px; line-height: 1.8;">
                      Vous avez maintenant un accès <strong>illimité</strong> à toutes les fonctionnalités professionnelles :
                    </p>
                  </div>

                  <!-- Liste des avantages -->
                  <div style="margin: 32px 0;">
                    <div style="display: table; width: 100%; margin-bottom: 16px;">
                      <div style="display: table-cell; vertical-align: top; padding-right: 12px;">
                        <span style="display: inline-block; width: 24px; height: 24px; background: #dcfce7; color: #16a34a; border-radius: 50%; text-align: center; line-height: 24px; font-weight: 700; font-size: 14px;">✓</span>
                      </div>
                      <div style="display: table-cell; vertical-align: top;">
                        <p style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 600;">Scans IA illimités</p>
                        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">Numérisez toutes vos factures en quelques secondes</p>
                      </div>
                    </div>
                    
                    <div style="display: table; width: 100%; margin-bottom: 16px;">
                      <div style="display: table-cell; vertical-align: top; padding-right: 12px;">
                        <span style="display: inline-block; width: 24px; height: 24px; background: #dcfce7; color: #16a34a; border-radius: 50%; text-align: center; line-height: 24px; font-weight: 700; font-size: 14px;">✓</span>
                      </div>
                      <div style="display: table-cell; vertical-align: top;">
                        <p style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 600;">Exports PDF / Excel / CSV</p>
                        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">Partagez vos données avec votre comptable</p>
                      </div>
                    </div>
                    
                    <div style="display: table; width: 100%; margin-bottom: 16px;">
                      <div style="display: table-cell; vertical-align: top; padding-right: 12px;">
                        <span style="display: inline-block; width: 24px; height: 24px; background: #dcfce7; color: #16a34a; border-radius: 50%; text-align: center; line-height: 24px; font-weight: 700; font-size: 14px;">✓</span>
                      </div>
                      <div style="display: table-cell; vertical-align: top;">
                        <p style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 600;">Dossiers personnalisés</p>
                        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">Organisez vos factures par projets ou catégories</p>
                      </div>
                    </div>
                    
                    <div style="display: table; width: 100%;">
                      <div style="display: table-cell; vertical-align: top; padding-right: 12px;">
                        <span style="display: inline-block; width: 24px; height: 24px; background: #dcfce7; color: #16a34a; border-radius: 50%; text-align: center; line-height: 24px; font-weight: 700; font-size: 14px;">✓</span>
                      </div>
                      <div style="display: table-cell; vertical-align: top;">
                        <p style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 600;">Support prioritaire 7j/7</p>
                        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">Une question ? Notre équipe est là pour vous</p>
                      </div>
                    </div>
                  </div>

                  <!-- Bouton CTA -->
                  <div style="text-align: center; margin: 40px 0 24px 0;">
                    <a href="https://artisscan.vercel.app/dashboard" style="display: inline-block; padding: 18px 48px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-decoration: none; border-radius: 16px; font-weight: 900; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 10px 25px -5px rgba(249, 115, 22, 0.4); transition: transform 0.2s;">
                      🎯 Accéder à mon Dashboard Pro
                    </a>
                  </div>

                  <p style="margin: 24px 0 0 0; text-align: center; color: #94a3b8; font-size: 13px; line-height: 1.6;">
                    Vous pouvez également copier ce lien :<br>
                    <a href="https://artisscan.vercel.app/dashboard" style="color: #f97316; text-decoration: none; font-weight: 600;">https://artisscan.vercel.app/dashboard</a>
                  </p>
                </div>

                <!-- Conseils de démarrage -->
                <div style="margin-top: 32px; padding: 24px; background: white; border-radius: 16px; border: 1px solid #e2e8f0;">
                  <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px; font-weight: 800;">💡 Pour bien démarrer</h3>
                  <ol style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
                    <li style="margin-bottom: 8px;">Prenez une photo de votre première facture avec le bouton orange central</li>
                    <li style="margin-bottom: 8px;">L'IA extrait automatiquement les informations (fournisseur, montant, TVA)</li>
                    <li style="margin-bottom: 8px;">Vérifiez et validez les données</li>
                    <li>Créez vos dossiers pour organiser vos factures par projet</li>
                  </ol>
                </div>

                <!-- Footer -->
                <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                  <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 13px; line-height: 1.6;">
                    Une question ? Répondez directement à cet email, nous sommes là pour vous aider.
                  </p>
                  <p style="margin: 0 0 24px 0; color: #cbd5e1; font-size: 12px;">
                    © ${new Date().getFullYear()} ArtisScan - Gestion intelligente pour artisans<br>
                    Vous recevez cet email car vous venez de créer un compte ArtisScan Pro.
                  </p>
                  <div style="display: inline-flex; gap: 16px; margin-top: 16px;">
                    <a href="https://artisscan.vercel.app" style="color: #94a3b8; text-decoration: none; font-size: 12px; font-weight: 600;">Site web</a>
                    <span style="color: #cbd5e1;">•</span>
                    <a href="https://artisscan.vercel.app/dashboard" style="color: #94a3b8; text-decoration: none; font-size: 12px; font-weight: 600;">Dashboard</a>
                    <span style="color: #cbd5e1;">•</span>
                    <a href="mailto:support@artisscan.fr" style="color: #94a3b8; text-decoration: none; font-size: 12px; font-weight: 600;">Support</a>
                  </div>
                </div>

              </div>
            </body>
            </html>
          `;

          const { data: emailData, error: emailError } = await resend.emails.send({
            from: 'ArtisScan <bienvenue@artisscan.fr>',
            to: [userEmail],
            subject: 'Bienvenue sur votre Dashboard ArtisScan Pro ! 🚀',
            html: emailHtml,
            replyTo: 'support@artisscan.fr',
          });

          if (emailError) {
            console.error('❌ Erreur envoi email de bienvenue:', emailError);
          } else {
            console.log('✅ Email de bienvenue envoyé avec succès:', emailData);
          }
        } catch (emailErr) {
          console.error('❌ Exception lors de l\'envoi de l\'email:', emailErr);
        }
      } else {
        console.warn('⚠️ RESEND_API_KEY manquante, email de bienvenue non envoyé');
      }
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

