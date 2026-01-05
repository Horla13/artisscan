import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  console.log('📧 API send-accounting: Requête reçue');

  const resendApiKey = process.env.RESEND_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!resendApiKey || !supabaseUrl || !serviceRoleKey) {
    console.error('❌ Variables d\'environnement manquantes');
    return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 });
  }

  const resend = new Resend(resendApiKey);
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    const { 
      comptableEmail, 
      userName,
      userEmail,
      fileData, 
      fileName, 
      fileType,
      invoicesCount,
      totalHT,
      totalTVA,
      totalTTC,
      periodDescription
    } = body;

    if (!comptableEmail || !fileData || !fileName) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    console.log('📧 Envoi à:', comptableEmail);
    console.log('📎 Fichier:', fileName);
    console.log('📊 Factures:', invoicesCount);

    // Déterminer le type MIME
    let mimeType = 'application/octet-stream';
    if (fileType === 'pdf') {
      mimeType = 'application/pdf';
    } else if (fileType === 'xlsx' || fileType === 'excel') {
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (fileType === 'csv') {
      mimeType = 'text/csv';
    }

    // Construire le corps de l'email avec design ArtisScan Orange #FF8C00
    const emailBody = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pièces comptables ArtisScan</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', 'Roboto', sans-serif; background-color: #f8fafc;">
        
        <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff;">
          
          <!-- Header avec Logo ArtisScan Officiel -->
          <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 50px 40px; text-align: center;">
            <img 
              src="https://www.artisscan.fr/logo.svg" 
              alt="ArtisScan" 
              width="200" 
              style="display: block; margin: 0 auto; max-width: 200px; height: auto;"
            />
            <div style="margin-top: 20px;">
              <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.5px;">
                ArtisScan
              </h1>
              <p style="color: #cbd5e1; font-size: 13px; font-weight: 500; margin: 0; text-transform: uppercase; letter-spacing: 2px;">
                Gestion Intelligente
              </p>
            </div>
          </div>

          <!-- Contenu Principal -->
          <div style="padding: 50px 40px;">
            
            <!-- Titre et Message -->
            <div style="margin-bottom: 40px;">
              <h2 style="color: #1e293b; font-size: 28px; font-weight: 700; margin: 0 0 24px 0;">
                📊 Pièces comptables
              </h2>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.8; margin: 0 0 16px 0;">
                Bonjour,
              </p>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.8; margin: 0;">
                Vous trouverez ci-joint les pièces comptables de <strong style="color: #1e293b; font-weight: 600;">${userName || userEmail || 'votre client'}</strong>${periodDescription ? ` pour la période <strong style="color: #FF8C00; font-weight: 600;">${periodDescription}</strong>` : ''}.
              </p>
            </div>

            <!-- Tableau Récapitulatif Financier -->
            <div style="background-color: #fafafa; border: 2px solid #FF8C00; border-radius: 16px; padding: 32px; margin-bottom: 40px;">
              
              <h3 style="color: #FF8C00; font-size: 20px; font-weight: 700; margin: 0 0 28px 0; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
                Récapitulatif Financier
              </h3>
              
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;">
                
                <!-- En-tête Orange -->
                <thead>
                  <tr>
                    <th style="padding: 20px 20px 20px 0; text-align: left; color: #FF8C00; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 3px solid #FF8C00;">
                      Libellé
                    </th>
                    <th style="padding: 20px 0 20px 20px; text-align: right; color: #FF8C00; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 3px solid #FF8C00;">
                      Montant
                    </th>
                  </tr>
                </thead>
                
                <!-- Corps du tableau -->
                <tbody>
                  
                  <!-- Nombre de factures -->
                  <tr>
                    <td style="padding: 20px 20px 20px 0; color: #64748b; font-size: 15px; border-bottom: 1px solid #e2e8f0;">
                      Nombre de factures
                    </td>
                    <td style="padding: 20px 0 20px 20px; color: #1e293b; font-size: 15px; font-weight: 600; text-align: right; border-bottom: 1px solid #e2e8f0;">
                      ${invoicesCount || 0}
                    </td>
                  </tr>
                  
                  ${totalHT ? `
                  <!-- Total HT -->
                  <tr>
                    <td style="padding: 20px 20px 20px 0; color: #64748b; font-size: 15px; border-bottom: 1px solid #e2e8f0;">
                      Total Hors Taxes (HT)
                    </td>
                    <td style="padding: 20px 0 20px 20px; color: #1e293b; font-size: 18px; font-weight: 700; text-align: right; border-bottom: 1px solid #e2e8f0;">
                      ${totalHT} €
                    </td>
                  </tr>
                  ` : ''}
                  
                  ${totalTVA ? `
                  <!-- TVA Récupérable -->
                  <tr>
                    <td style="padding: 20px 20px 20px 0; color: #64748b; font-size: 15px; border-bottom: 1px solid #e2e8f0;">
                      TVA Récupérable
                    </td>
                    <td style="padding: 20px 0 20px 20px; color: #10b981; font-size: 18px; font-weight: 700; text-align: right; border-bottom: 1px solid #e2e8f0;">
                      + ${totalTVA} €
                    </td>
                  </tr>
                  ` : ''}
                  
                </tbody>
              </table>
              
              ${totalTTC ? `
              <!-- Total TTC (Encadré Orange) -->
              <div style="margin-top: 28px; background: linear-gradient(135deg, #fff5e6 0%, #ffe6cc 100%); border: 3px solid #FF8C00; border-radius: 12px; padding: 24px; text-align: center;">
                <p style="color: #cc6600; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px 0;">
                  💰 Total TTC
                </p>
                <p style="color: #FF8C00; font-size: 38px; font-weight: 900; margin: 0; letter-spacing: -1px;">
                  ${totalTTC} €
                </p>
              </div>
              ` : ''}
              
              <!-- Info Format -->
              <div style="margin-top: 24px; text-align: right;">
                <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                  <strong>Format du fichier :</strong> ${fileName.split('.').pop()?.toUpperCase()}
                </p>
              </div>
              
            </div>

            <!-- Ligne de séparation fine -->
            <div style="border-top: 1px solid #e2e8f0; margin: 40px 0 32px;"></div>

            <!-- Signature -->
            <div style="margin-bottom: 32px;">
              <p style="color: #64748b; font-size: 16px; line-height: 1.8; margin: 0 0 12px 0;">
                Cordialement,
              </p>
              <p style="margin: 0 0 8px 0;">
                <span style="color: #FF8C00; font-size: 18px; font-weight: 700;">L'équipe ArtisScan</span>
              </p>
              <p style="margin: 0;">
                <a href="mailto:contact@artisscan.fr" style="color: #FF8C00; font-size: 14px; text-decoration: none; font-weight: 600;">
                  ✉️ contact@artisscan.fr
                </a>
              </p>
            </div>

            <!-- Ligne de séparation -->
            <div style="border-top: 1px solid #e2e8f0; margin: 32px 0; padding-top: 24px;">
              <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0; line-height: 1.6;">
                <strong style="color: #FF8C00;">ArtisScan</strong> — La gestion intelligente pour les artisans
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div style="background-color: #1e293b; padding: 32px 40px; text-align: center;">
            <p style="color: #94a3b8; font-size: 13px; margin: 0 0 8px 0; line-height: 1.6;">
              <strong style="color: #ffffff;">ArtisScan</strong> - Gestion intelligente pour artisans
            </p>
            <p style="color: #64748b; font-size: 12px; margin: 0; line-height: 1.6;">
              © ${new Date().getFullYear()} ArtisScan. Tous droits réservés.
            </p>
            <div style="margin-top: 16px;">
              <a href="https://www.artisscan.fr" style="color: #FF8C00; text-decoration: none; font-size: 12px; font-weight: 600; margin: 0 12px;">
                Site web
              </a>
              <span style="color: #475569;">•</span>
              <a href="https://www.artisscan.fr/legal/confidentialite" style="color: #FF8C00; text-decoration: none; font-size: 12px; font-weight: 600; margin: 0 12px;">
                Confidentialité
              </a>
              <span style="color: #475569;">•</span>
              <a href="mailto:contact@artisscan.fr" style="color: #FF8C00; text-decoration: none; font-size: 12px; font-weight: 600; margin: 0 12px;">
                Contact
              </a>
            </div>
          </div>

        </div>
        
      </body>
      </html>
    `;

    // Préparer la pièce jointe
    const attachment = {
      filename: fileName,
      content: fileData, // Base64 string
    };

    // Envoyer l'email via Resend
    const { data, error } = await resend.emails.send({
      from: 'ArtisScan <contact@artisscan.fr>',
      to: [comptableEmail],
      subject: `Pièces comptables ${userName || userEmail || ''} - ${periodDescription || new Date().toLocaleDateString('fr-FR')}`,
      html: emailBody,
      attachments: [attachment],
      ...(userEmail && { reply_to: userEmail }), // Répondre directement au client
    });

    if (error) {
      console.error('❌ Erreur Resend:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Email envoyé avec succès:', data);

    return NextResponse.json({ 
      success: true, 
      messageId: data?.id,
      message: `Email envoyé à ${comptableEmail}`
    });

  } catch (err: any) {
    console.error('❌ Erreur send-accounting:', err);
    return NextResponse.json({ 
      error: err.message || 'Erreur lors de l\'envoi de l\'email' 
    }, { status: 500 });
  }
}

