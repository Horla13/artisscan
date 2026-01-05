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

    // Construire le corps de l'email
    const emailBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header avec logo -->
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; padding: 16px 24px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(249, 115, 22, 0.3);">
            <span style="color: white; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">ArtisScan</span>
          </div>
          <p style="color: #64748b; font-size: 11px; font-weight: 600; letter-spacing: 2px; margin-top: 8px; text-transform: uppercase;">Gestion Intelligente</p>
        </div>

        <!-- Contenu principal -->
        <div style="background-color: white; border: 1px solid #e2e8f0; border-radius: 24px; padding: 32px; margin-bottom: 24px;">
          <h1 style="color: #1e293b; font-size: 24px; font-weight: 900; margin: 0 0 16px 0;">Pièces comptables</h1>
          
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            Bonjour,
          </p>
          
          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
            Vous trouverez ci-joint les pièces comptables de <strong style="color: #1e293b;">${userName || userEmail || 'votre client'}</strong> ${periodDescription ? `pour ${periodDescription}` : ''}.
          </p>

          <!-- Récapitulatif -->
          <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border: 2px solid #fed7aa; border-radius: 16px; padding: 24px; margin: 24px 0; box-shadow: 0 4px 6px -1px rgba(249, 115, 22, 0.1);">
            <p style="color: #9a3412; font-weight: 800; font-size: 14px; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">
              📊 Récapitulatif Financier
            </p>
            
            <div style="background-color: white; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;">
                <span style="color: #64748b; font-size: 14px; font-weight: 600;">Nombre de factures</span>
                <span style="color: #1e293b; font-size: 16px; font-weight: 900;">${invoicesCount || 0}</span>
              </div>
              
              ${totalHT ? `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;">
                <span style="color: #64748b; font-size: 14px; font-weight: 600;">Total HT</span>
                <span style="color: #1e293b; font-size: 20px; font-weight: 900;">${totalHT} €</span>
              </div>
              ` : ''}
              
              ${totalTVA ? `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;">
                <span style="color: #64748b; font-size: 14px; font-weight: 600;">TVA Récupérable</span>
                <span style="color: #16a34a; font-size: 20px; font-weight: 900;">+ ${totalTVA} €</span>
              </div>
              ` : ''}
              
              ${totalTTC ? `
              <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 4px;">
                <span style="color: #f97316; font-size: 15px; font-weight: 700; text-transform: uppercase;">Total TTC</span>
                <span style="color: #f97316; font-size: 24px; font-weight: 900;">${totalTTC} €</span>
              </div>
              ` : ''}
            </div>
            
            <div style="text-align: center; margin-top: 12px;">
              <p style="color: #9a3412; font-size: 13px; font-weight: 600; margin: 0;">
                <strong>Format :</strong> ${fileName.split('.').pop()?.toUpperCase()}
              </p>
            </div>
          </div>

          <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 24px 0 0 0;">
            Cordialement,<br>
            <strong style="color: #1e293b;">L'équipe ArtisScan</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 24px; border-top: 1px solid #f1f5f9;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px 0;">
            Envoyé via ArtisScan - Gestion intelligente pour artisans
          </p>
          <p style="color: #cbd5e1; font-size: 11px; margin: 0;">
            © ${new Date().getFullYear()} ArtisScan
          </p>
        </div>
      </div>
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

