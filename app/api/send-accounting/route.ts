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

    // Construire le corps de l'email avec design premium
    const emailBody = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pièces comptables ArtisScan</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9fafb;">
        <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff;">
          
          <!-- Header avec Logo -->
          <div style="text-align: center; padding: 40px 20px 30px;">
            <img 
              src="https://i.ibb.co/XYY8H2/logo-artisscan-gestion-intelligente.png" 
              alt="ArtisScan" 
              width="180" 
              style="max-width: 100%; height: auto; display: inline-block;"
            />
          </div>

          <!-- Contenu principal -->
          <div style="padding: 0 30px 40px;">
            
            <!-- Titre -->
            <h1 style="color: #111827; font-size: 26px; font-weight: 700; margin: 0 0 24px 0; text-align: left;">
              Pièces comptables
            </h1>
            
            <!-- Message d'introduction -->
            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">
              Bonjour,
            </p>
            
            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 32px 0;">
              Vous trouverez ci-joint les pièces comptables de <strong style="color: #111827;">${userName || userEmail || 'votre client'}</strong>${periodDescription ? ` pour <strong>${periodDescription}</strong>` : ''}.
            </p>

            <!-- Tableau Récapitulatif Financier -->
            <div style="margin: 32px 0;">
              <h2 style="color: #111827; font-size: 18px; font-weight: 700; margin: 0 0 16px 0;">
                📊 Récapitulatif Financier
              </h2>
              
              <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                
                <!-- En-tête du tableau -->
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px 16px; text-align: left; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                      Libellé
                    </th>
                    <th style="padding: 12px 16px; text-align: right; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                      Montant
                    </th>
                  </tr>
                </thead>
                
                <!-- Corps du tableau -->
                <tbody>
                  
                  <!-- Nombre de factures -->
                  <tr>
                    <td style="padding: 12px 16px; color: #374151; font-size: 14px; border-bottom: 1px solid #f3f4f6;">
                      Nombre de factures
                    </td>
                    <td style="padding: 12px 16px; color: #111827; font-size: 14px; font-weight: 600; text-align: right; border-bottom: 1px solid #f3f4f6;">
                      ${invoicesCount || 0}
                    </td>
                  </tr>
                  
                  ${totalHT ? `
                  <!-- Total HT -->
                  <tr>
                    <td style="padding: 12px 16px; color: #374151; font-size: 14px; border-bottom: 1px solid #f3f4f6;">
                      Total Hors Taxes (HT)
                    </td>
                    <td style="padding: 12px 16px; color: #111827; font-size: 16px; font-weight: 700; text-align: right; border-bottom: 1px solid #f3f4f6;">
                      ${totalHT} €
                    </td>
                  </tr>
                  ` : ''}
                  
                  ${totalTVA ? `
                  <!-- TVA Récupérable -->
                  <tr>
                    <td style="padding: 12px 16px; color: #374151; font-size: 14px; border-bottom: 1px solid #f3f4f6;">
                      TVA Récupérable
                    </td>
                    <td style="padding: 12px 16px; color: #059669; font-size: 16px; font-weight: 700; text-align: right; border-bottom: 1px solid #f3f4f6;">
                      + ${totalTVA} €
                    </td>
                  </tr>
                  ` : ''}
                  
                  ${totalTTC ? `
                  <!-- Total TTC (mis en valeur) -->
                  <tr style="background-color: #fef3c7;">
                    <td style="padding: 16px; color: #92400e; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      Total TTC
                    </td>
                    <td style="padding: 16px; color: #92400e; font-size: 22px; font-weight: 900; text-align: right;">
                      ${totalTTC} €
                    </td>
                  </tr>
                  ` : ''}
                  
                </tbody>
              </table>
              
              <!-- Format du fichier -->
              <p style="color: #6b7280; font-size: 13px; margin: 12px 0 0 0; text-align: right;">
                <strong>Format :</strong> ${fileName.split('.').pop()?.toUpperCase()}
              </p>
            </div>

            <!-- Ligne de séparation -->
            <div style="border-top: 1px solid #e5e7eb; margin: 32px 0 24px;"></div>

            <!-- Signature -->
            <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0;">
              Cordialement,<br>
              <strong style="color: #111827;">L'équipe ArtisScan</strong>
            </p>

          </div>

          <!-- Pied de page -->
          <div style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0; line-height: 1.5;">
              <strong style="color: #6b7280;">ArtisScan</strong> - Gestion intelligente pour artisans
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0; line-height: 1.5;">
              <a href="mailto:contact@artisscan.fr" style="color: #f97316; text-decoration: none;">contact@artisscan.fr</a>
            </p>
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

