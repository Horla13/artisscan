import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';

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
      invoices, // Données des factures pour générer CSV
      invoicesCount,
      totalHT,
      totalTVA,
      totalTTC,
      periodDescription
    } = body;

    if (!comptableEmail || !invoices || invoices.length === 0) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    console.log('📧 Envoi à:', comptableEmail);
    console.log('📊 Factures:', invoicesCount);

    // ========== GÉNÉRATION DU CSV ==========
    const csvHeader = 'Date,Nom du fournisseur,Montant HT,Montant TVA,Montant TTC\n';
    const csvRows = invoices.map((inv: any) => {
      const date = new Date(inv.date_facture).toLocaleDateString('fr-FR');
      const fournisseur = `"${inv.entreprise || 'N/A'}"`;
      const ht = (inv.montant_ht || 0).toFixed(2);
      const tva = (inv.tva || ((inv.montant_ttc || inv.total_amount) - inv.montant_ht) || 0).toFixed(2);
      const ttc = (inv.montant_ttc || inv.total_amount || 0).toFixed(2);
      return `${date},${fournisseur},${ht},${tva},${ttc}`;
    }).join('\n');
    
    const csvContent = csvHeader + csvRows;
    const csvBase64 = Buffer.from(csvContent, 'utf-8').toString('base64');
    const csvFileName = `export_comptable_${periodDescription?.replace(/\s+/g, '_') || 'factures'}.csv`;

    // ========== GÉNÉRATION DU PDF RÉCAPITULATIF ==========
    const doc = new jsPDF();
    
    // Header Orange
    doc.setFillColor(255, 140, 0); // #FF8C00
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('ArtisScan', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('GESTION INTELLIGENTE', 105, 30, { align: 'center' });
    
    // Titre
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Récapitulatif Comptable', 20, 60);
    
    // Informations
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Client : ${userName || userEmail || 'N/A'}`, 20, 75);
    if (periodDescription) {
      doc.text(`Période : ${periodDescription}`, 20, 82);
    }
    
    // Tableau récapitulatif
    let yPos = 100;
    doc.setFillColor(250, 250, 250);
    doc.rect(20, yPos, 170, 60, 'F');
    
    // Bordure Orange
    doc.setDrawColor(255, 140, 0);
    doc.setLineWidth(2);
    doc.rect(20, yPos, 170, 60);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 140, 0);
    doc.text('RÉCAPITULATIF FINANCIER', 105, yPos + 10, { align: 'center' });
    
    yPos += 25;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    
    doc.text('Nombre de factures', 30, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(String(invoicesCount || 0), 180, yPos, { align: 'right' });
    
    if (totalHT) {
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Total HT', 30, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`${totalHT} €`, 180, yPos, { align: 'right' });
    }
    
    if (totalTVA) {
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('TVA Récupérable', 30, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(`+ ${totalTVA} €`, 180, yPos, { align: 'right' });
    }
    
    if (totalTTC) {
      yPos += 12;
      doc.setFillColor(255, 245, 230);
      doc.rect(30, yPos - 6, 160, 12, 'F');
      doc.setDrawColor(255, 140, 0);
      doc.setLineWidth(1.5);
      doc.rect(30, yPos - 6, 160, 12);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 140, 0);
      doc.text('TOTAL TTC', 35, yPos);
      doc.setFontSize(14);
      doc.text(`${totalTTC} €`, 185, yPos, { align: 'right' });
    }
    
    // Footer
    yPos = 270;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('ArtisScan — La gestion intelligente pour les artisans', 105, yPos + 7, { align: 'center' });
    doc.text('contact@artisscan.fr', 105, yPos + 12, { align: 'center' });
    
    const pdfBase64 = doc.output('dataurlstring').split(',')[1];
    const pdfFileName = `recapitulatif_${periodDescription?.replace(/\s+/g, '_') || 'factures'}.pdf`;

    // ========== CORPS DE L'EMAIL ==========
    const emailBody = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pièces comptables ArtisScan</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', 'Roboto', sans-serif; background-color: #f8fafc;">
  
  <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header Texte Stylisé (sans image) -->
    <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 50px 40px; text-align: center;">
      <h1 style="color: #FF8C00; font-size: 36px; font-weight: 900; margin: 0 0 12px 0; letter-spacing: 2px; text-transform: uppercase;">
        ARTISSCAN
      </h1>
      <p style="color: #94a3b8; font-size: 14px; font-weight: 400; margin: 0; letter-spacing: 0.5px;">
        Gestion intelligente pour artisans
      </p>
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
        
        <p style="color: #475569; font-size: 16px; line-height: 1.8; margin: 0 0 12px 0;">
          Vous trouverez ci-joint <strong style="color: #1e293b;">le récapitulatif PDF et l'export CSV</strong> pour traitement comptable de <strong style="color: #1e293b; font-weight: 600;">${userName || userEmail || 'votre client'}</strong>${periodDescription ? ` pour la période <strong style="color: #FF8C00; font-weight: 600;">${periodDescription}</strong>` : ''}.
        </p>
        
        <div style="background-color: #fff7ed; border-left: 4px solid #FF8C00; padding: 16px; margin: 20px 0; border-radius: 8px;">
          <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
            <strong>📎 Pièces jointes :</strong><br>
            • Récapitulatif PDF (lecture)<br>
            • Export CSV (import comptable)
          </p>
        </div>
      </div>

      <!-- Tableau Récapitulatif Financier -->
      <div style="background-color: #fafafa; border: 2px solid #FF8C00; border-radius: 16px; padding: 25px; margin-bottom: 40px;">
        
        <h3 style="color: #FF8C00; font-size: 22px; font-weight: 700; margin: 0 0 30px 0; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
          Récapitulatif Financier
        </h3>
        
        <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;">
          
          <!-- En-tête Orange -->
          <thead>
            <tr>
              <th style="padding: 25px 30px 25px 0; text-align: left; color: #FF8C00; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 3px solid #FF8C00;">
                Libellé
              </th>
              <th style="padding: 25px 0 25px 30px; text-align: right; color: #FF8C00; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 3px solid #FF8C00;">
                Montant
              </th>
            </tr>
          </thead>
          
          <!-- Corps du tableau -->
          <tbody>
            
            <!-- Nombre de factures -->
            <tr>
              <td style="padding: 25px 30px 25px 0; color: #64748b; font-size: 16px; border-bottom: 1px solid #e2e8f0;">
                Nombre de factures
              </td>
              <td style="padding: 25px 0 25px 30px; color: #1e293b; font-size: 16px; font-weight: 600; text-align: right; border-bottom: 1px solid #e2e8f0;">
                ${invoicesCount || 0}
              </td>
            </tr>
            
            ${totalHT ? `
            <!-- Total HT -->
            <tr>
              <td style="padding: 25px 30px 25px 0; color: #64748b; font-size: 16px; border-bottom: 1px solid #e2e8f0;">
                Total Hors Taxes (HT)
              </td>
              <td style="padding: 25px 0 25px 30px; color: #1e293b; font-size: 19px; font-weight: 700; text-align: right; border-bottom: 1px solid #e2e8f0;">
                ${totalHT} €
              </td>
            </tr>
            ` : ''}
            
            ${totalTVA ? `
            <!-- TVA Récupérable -->
            <tr>
              <td style="padding: 25px 30px 25px 0; color: #64748b; font-size: 16px; border-bottom: 1px solid #e2e8f0;">
                TVA Récupérable
              </td>
              <td style="padding: 25px 0 25px 30px; color: #10b981; font-size: 19px; font-weight: 700; text-align: right; border-bottom: 1px solid #e2e8f0;">
                + ${totalTVA} €
              </td>
            </tr>
            ` : ''}
            
          </tbody>
        </table>
        
        ${totalTTC ? `
        <!-- Total TTC (Encadré Orange) -->
        <div style="margin-top: 30px; background: linear-gradient(135deg, #fff5e6 0%, #ffe6cc 100%); border: 3px solid #FF8C00; border-radius: 12px; padding: 28px; text-align: center;">
          <p style="color: #cc6600; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 12px 0;">
            💰 TOTAL TTC
          </p>
          <p style="color: #FF8C00; font-size: 42px; font-weight: 900; margin: 0; letter-spacing: -1px;">
            ${totalTTC} €
          </p>
        </div>
        ` : ''}
        
      </div>

      <!-- Ligne de séparation fine -->
      <div style="border-top: 1px solid #e2e8f0; margin: 40px 0 32px;"></div>

      <!-- Signature Simple -->
      <div style="margin-bottom: 40px;">
        <p style="color: #64748b; font-size: 16px; line-height: 1.8; margin: 0 0 8px 0;">
          Cordialement,
        </p>
        <p style="margin: 0;">
          <span style="color: #FF8C00; font-size: 18px; font-weight: 700;">L'équipe ArtisScan</span>
        </p>
      </div>

      <!-- Ligne de séparation -->
      <div style="border-top: 1px solid #e2e8f0; margin: 32px 0; padding-top: 20px;">
        <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 0; line-height: 1.6;">
          <strong style="color: #FF8C00;">ArtisScan</strong> — La gestion intelligente pour les artisans
        </p>
        <p style="color: #94a3b8; font-size: 13px; text-align: center; margin: 8px 0 0 0;">
          <a href="mailto:contact@artisscan.fr" style="color: #FF8C00; text-decoration: none;">contact@artisscan.fr</a>
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
</html>`;

    // Préparer les pièces jointes (PDF + CSV)
    const attachments = [
      {
        filename: pdfFileName,
        content: pdfBase64,
      },
      {
        filename: csvFileName,
        content: csvBase64,
      }
    ];

    // Envoyer l'email via Resend
    const { data, error } = await resend.emails.send({
      from: 'ArtisScan <contact@artisscan.fr>',
      to: [comptableEmail],
      subject: `Pièces comptables ${userName || userEmail || ''} - ${periodDescription || new Date().toLocaleDateString('fr-FR')}`,
      html: emailBody,
      attachments: attachments,
      ...(userEmail && { replyTo: userEmail }), // Répondre directement au client
    });

    if (error) {
      console.error('❌ Erreur Resend:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Email envoyé avec succès:', data);

    return NextResponse.json({ 
      success: true, 
      messageId: data?.id,
      message: `Email envoyé à ${comptableEmail} avec PDF et CSV`
    });

  } catch (err: any) {
    console.error('❌ Erreur send-accounting:', err);
    return NextResponse.json({ 
      error: err.message || 'Erreur lors de l\'envoi de l\'email' 
    }, { status: 500 });
  }
}
