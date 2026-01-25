import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sendMail } from '@/lib/sendMail';
import {
  generateAccountingCSV,
  generateFEC,
  getBestEffortAmounts,
  toYyyyMmDdOrToday,
  getAccountingPeriodLabel,
  formatDecimalDot,
} from '@/lib/accountingExports';

// ========== TYPES POUR LE FORMAT FEC ==========
interface LigneEcriture {
  journalCode: string;
  journalLibelle: string;
  ecritureNum: string;
  ecritureDate: string;
  compteNum: string;
  compteLibelle: string;
  compAuxNum?: string;
  compAuxLibelle?: string;
  pieceRef: string;
  pieceDate: string;
  ecritureLib: string;
  debit?: number;
  credit?: number;
  ecritureLettrage?: string;
  dateLettrage?: string;
  validDate: string;
  montantDevise?: number;
  idevise: string;
}

// ========== CSV "PIVOT" COMPTABLE (simple & universel) ==========
function formatDateFR(raw?: string): string {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR'); // JJ/MM/AAAA
}

function formatDecimalFR(n: number): string {
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toFixed(2).replace('.', ',');
}

function escapeCSV(value: any): string {
  const v = (value ?? '').toString().replace(/\r?\n/g, ' ');
  return `"${v.replace(/"/g, '""')}"`;
}

function getInvoiceAmounts(inv: any): { ht: number; tva: number; ttc: number } {
  // ✅ Champs standard (DB)
  const htRaw = inv?.amount_ht;
  const tvaRaw = inv?.amount_tva;
  const ttcRaw = inv?.total_amount;

  const ht = Number.isFinite(Number(htRaw)) ? Number(htRaw) : 0;
  const ttc = Number.isFinite(Number(ttcRaw)) ? Number(ttcRaw) : 0;
  const tva = Number.isFinite(Number(tvaRaw)) ? Number(tvaRaw) : 0;

  return { ht, tva, ttc };
}

function isMathCoherent(ht: number, tva: number, ttc: number): boolean {
  return Math.abs((ht + tva) - ttc) <= 0.05;
}

function generatePivotCSV(invoices: any[]): string {
  const headers = [
    'Date',
    'Fournisseur',
    'Numéro facture',
    'Montant HT',
    'Montant TVA',
    'Montant TTC',
    'Catégorie',
    'Date d’ajout',
    'Modifié manuellement',
  ];

  for (const inv of invoices) {
    const { ht, tva, ttc } = getInvoiceAmounts(inv);
    if (!isMathCoherent(ht, tva, ttc)) {
      throw new Error('CSV pivot : montants incohérents (HT + TVA ≠ TTC).');
    }
  }

  const rows = invoices.map((inv) => {
    const { ht, tva, ttc } = getInvoiceAmounts(inv);
    const dateFacture = formatDateFR(inv?.date_facture || inv?.created_at);
    const fournisseur = (inv?.entreprise || 'Non renseigné').toString().trim() || 'Non renseigné';
    const categorie = inv?.categorie || 'Non classé';
    const dateAjout = formatDateFR(inv?.created_at);

    // Numéro facture: non stocké en V1 (si dispo)
    const numeroFacture = inv?.numero_facture || inv?.invoice_number || '';

    const modifie = '—'; // V1: colonne DB absente, ne pas dépendre de modified_manually

    return [
      dateFacture,
      escapeCSV(fournisseur),
      escapeCSV(numeroFacture),
      formatDecimalFR(ht),
      formatDecimalFR(tva),
      formatDecimalFR(ttc),
      escapeCSV(categorie),
      dateAjout,
      modifie,
    ].join(';');
  });

  const BOM = '\uFEFF';
  return BOM + headers.join(';') + '\n' + rows.join('\n');
}

// ========== VALIDATION D'ÉQUILIBRE DÉBIT/CRÉDIT ==========
function validateEquilibre(ecritures: LigneEcriture[]): { 
  valid: boolean; 
  totalDebit: number; 
  totalCredit: number; 
  error?: string 
} {
  // Grouper par EcritureNum (pièce comptable)
  const groupes = ecritures.reduce((acc, ligne) => {
    if (!acc[ligne.ecritureNum]) {
      acc[ligne.ecritureNum] = [];
    }
    acc[ligne.ecritureNum].push(ligne);
    return acc;
  }, {} as Record<string, LigneEcriture[]>);

  // Vérifier l'équilibre pour chaque pièce
  for (const [ecritureNum, lignes] of Object.entries(groupes)) {
    const totalDebit = lignes.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = lignes.reduce((sum, l) => sum + (l.credit || 0), 0);
    
    // Tolérance de 0.01€ pour les arrondis
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return {
        valid: false,
        totalDebit,
        totalCredit,
        error: `Écriture ${ecritureNum} non équilibrée : Débit ${totalDebit.toFixed(2)}€ ≠ Crédit ${totalCredit.toFixed(2)}€`
      };
    }
  }

  const totalDebit = ecritures.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = ecritures.reduce((sum, l) => sum + (l.credit || 0), 0);

  return { valid: true, totalDebit, totalCredit };
}

// ========== MAPPING INTELLIGENT DES COMPTES COMPTABLES ==========
const COMPTE_MAPPING: Record<string, { compte: string; libelle: string; seuilImmo?: number; compteImmo?: string }> = {
  'Matériaux': {
    compte: '601000',
    libelle: 'Achats de matières premières',
  },
  'Fournitures': {
    compte: '606000',
    libelle: 'Achats non stockés de matières et fournitures',
  },
  'Carburant': {
    compte: '606100',
    libelle: 'Fournitures non stockables (eau, énergie, carburant)',
  },
  'Outillage': {
    compte: '606300',
    libelle: 'Fournitures d\'entretien et de petit équipement',
    seuilImmo: 500, // Si > 500€ → Immobilisation
    compteImmo: '2154000',
  },
  'Services': {
    compte: '628000',
    libelle: 'Divers (services)',
  },
  'Abonnements': {
    compte: '628000',
    libelle: 'Divers (abonnements)',
  },
  'Restaurant': {
    compte: '625600',
    libelle: 'Missions',
  },
  'Location': {
    compte: '613000',
    libelle: 'Locations',
  },
  'Sous-traitance': {
    compte: '604000',
    libelle: 'Achats d\'études et prestations de services',
  },
};

function getCompteComptable(categorie: string, montantTTC: number): { compte: string; libelle: string } {
  const mapping = COMPTE_MAPPING[categorie];
  
  if (!mapping) {
    // Catégorie inconnue → Compte par défaut
    return {
      compte: '606000',
      libelle: 'Achats non stockés de matières et fournitures',
    };
  }
  
  // Si c'est de l'outillage et montant > 500€ → Immobilisation
  if (mapping.seuilImmo && mapping.compteImmo && montantTTC > mapping.seuilImmo) {
    return {
      compte: mapping.compteImmo,
      libelle: 'Matériel industriel',
    };
  }
  
  return {
    compte: mapping.compte,
    libelle: mapping.libelle,
  };
}

// ========== GÉNÉRATION CSV FORMAT FEC (Point-virgule, Virgule décimale) ==========
function generateFECCSV(invoices: any[]): string {
  const lignesEcritures: LigneEcriture[] = [];

  invoices.forEach((invoice, index) => {
    const ecritureNum = `FAC${new Date(invoice.date_facture).toISOString().slice(0, 10).replace(/-/g, '')}-${String(index + 1).padStart(3, '0')}`;
    const ecritureDate = new Date(invoice.date_facture).toLocaleDateString('fr-FR');
    const validDate = ecritureDate;
    const pieceRef = `FAC-${new Date(invoice.date_facture).getFullYear()}-${String(index + 1).padStart(3, '0')}`;
    const pieceDate = ecritureDate;
    
    const { ht, tva, ttc } = getInvoiceAmounts(invoice);
    
    const fournisseur = invoice.entreprise || 'Fournisseur inconnu';
    const description = invoice.description || `Achat - ${fournisseur}`;
    const categorie = invoice.categorie || 'Autre';
    
    // Mapping intelligent du compte comptable selon la catégorie
    const compteInfo = getCompteComptable(categorie, ttc);
    
    // Génération du code auxiliaire tiers (max 20 caractères) avec normalisation
    // Suppression des accents et caractères spéciaux pour compatibilité Sage/Cegid
    const cleanFournisseur = fournisseur
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_') // Garde uniquement alphanumérique
      .substring(0, 15);
    
    // Ajouter un hash unique si le nom est trop court
    const compAuxNum = cleanFournisseur.length < 5
      ? `FOUR_${cleanFournisseur}_${invoice.id?.slice(-4) || String(index).padStart(4, '0')}`
      : `FOUR_${cleanFournisseur}`;
    
    // ====== ÉCRITURE D'ACHAT (3 lignes par facture) ======
    
    // Ligne 1 : DÉBIT - Compte de charge (intelligent selon catégorie)
    lignesEcritures.push({
      journalCode: 'AC',
      journalLibelle: 'Achats',
      ecritureNum,
      ecritureDate,
      compteNum: compteInfo.compte,
      compteLibelle: compteInfo.libelle,
      compAuxNum: '',
      compAuxLibelle: '',
      pieceRef,
      pieceDate,
      ecritureLib: description,
      debit: ht,
      credit: undefined,
      ecritureLettrage: '',
      dateLettrage: '',
      validDate,
      montantDevise: undefined,
      idevise: 'EUR',
    });
    
    // Ligne 2 : DÉBIT - TVA déductible (44566)
    if (tva > 0) {
      lignesEcritures.push({
        journalCode: 'AC',
        journalLibelle: 'Achats',
        ecritureNum,
        ecritureDate,
        compteNum: '445660',
        compteLibelle: 'TVA déductible sur autres biens et services',
        compAuxNum: '',
        compAuxLibelle: '',
        pieceRef,
        pieceDate,
        ecritureLib: `TVA 20% - ${description}`,
        debit: tva,
        credit: undefined,
        ecritureLettrage: '',
        dateLettrage: '',
        validDate,
        montantDevise: undefined,
        idevise: 'EUR',
      });
    }
    
    // Ligne 3 : CRÉDIT - Fournisseurs (401)
    lignesEcritures.push({
      journalCode: 'AC',
      journalLibelle: 'Achats',
      ecritureNum,
      ecritureDate,
      compteNum: '401000',
      compteLibelle: 'Fournisseurs',
      compAuxNum,
      compAuxLibelle: fournisseur,
      pieceRef,
      pieceDate,
      ecritureLib: description,
      debit: undefined,
      credit: ttc,
      ecritureLettrage: '',
      dateLettrage: '',
      validDate,
      montantDevise: undefined,
      idevise: 'EUR',
    });
  });

  // ====== VALIDATION D'ÉQUILIBRE ======
  const validation = validateEquilibre(lignesEcritures);
  if (!validation.valid) {
    console.error('❌ Erreur équilibre comptable:', validation.error);
    throw new Error(validation.error);
  }

  console.log(`✅ Équilibre comptable validé : Débit ${validation.totalDebit.toFixed(2)}€ = Crédit ${validation.totalCredit.toFixed(2)}€`);

  // ====== GÉNÉRATION DU CSV (Point-virgule, Virgule décimale) ======
  const header = 'JournalCode;JournalLibelle;EcritureNum;EcritureDate;CompteNum;CompteLibelle;CompAuxNum;CompAuxLibelle;PieceRef;PieceDate;EcritureLib;Debit;Credit;EcritureLettrage;DateLettrage;ValidDate;MontantDevise;Idevise';
  
  const rows = lignesEcritures.map(ligne => {
    // Utiliser la VIRGULE comme séparateur décimal (format français)
    const debit = ligne.debit !== undefined ? ligne.debit.toFixed(2).replace('.', ',') : '';
    const credit = ligne.credit !== undefined ? ligne.credit.toFixed(2).replace('.', ',') : '';
    const montantDevise = ligne.montantDevise !== undefined ? ligne.montantDevise.toFixed(2).replace('.', ',') : '';
    
    return [
      ligne.journalCode,
      ligne.journalLibelle,
      ligne.ecritureNum,
      ligne.ecritureDate,
      ligne.compteNum,
      ligne.compteLibelle,
      ligne.compAuxNum || '',
      ligne.compAuxLibelle || '',
      ligne.pieceRef,
      ligne.pieceDate,
      ligne.ecritureLib,
      debit,
      credit,
      ligne.ecritureLettrage || '',
      ligne.dateLettrage || '',
      ligne.validDate,
      montantDevise,
      ligne.idevise,
    ].join(';'); // Point-virgule comme séparateur
  });

  // UTF-8 avec BOM pour compatibilité Excel
  const BOM = '\uFEFF';
  return BOM + header + '\n' + rows.join('\n');
}

export async function POST(req: NextRequest) {
  console.log('📧 API send-accounting: Requête reçue');

  const brevoApiKey = process.env.BREVO_API_KEY;
  const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL;
  const brevoSenderName = process.env.BREVO_SENDER_NAME;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!brevoApiKey || !brevoSenderEmail || !brevoSenderName || !supabaseUrl || !serviceRoleKey) {
    console.error('❌ Variables d\'environnement manquantes');
    return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1) Auth obligatoire (anti-spam)
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const token = authHeader.slice('Bearer '.length);
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
    }

    // 2) Autoriser uniquement les comptes PRO (source de vérité = profiles.is_pro)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_pro')
      .eq('id', user.id)
      .maybeSingle();

    if ((profile as any)?.is_pro !== true) {
      return NextResponse.json({ error: 'Abonnement requis' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      comptableEmail, 
      userName,
      userEmail,
      companyName,
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

    const safePeriodSlug = (periodDescription?.replace(/\s+/g, '_') || 'toutes_periodes').toString();

    // ========== EXPORT CSV COMPTABLE (cabinet) ==========
    const accountingCsv = generateAccountingCSV(invoices);
    const accountingCsvBase64 = Buffer.from(accountingCsv, 'utf-8').toString('base64');
    const accountingCsvFileName = `ArtisScan_CSV_comptable_${safePeriodSlug}.csv`;

    // ========== EXPORT FEC (France, strict) ==========
    const fec = generateFEC(invoices);
    const fecBase64 = Buffer.from(fec, 'utf-8').toString('base64');
    const fecFileName = `ArtisScan_FEC_${safePeriodSlug}.txt`;

    // ========== PDF COMPTABLE (A4 lisible) ==========
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const exportDate = new Date();
    const headerName = (companyName || userName || userEmail || 'Client').toString().trim();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text('Export comptable', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Entreprise : ${headerName}`, 14, 26);
    doc.text(`Date d’export : ${exportDate.toLocaleDateString('fr-FR')}`, 14, 32);
    doc.text(`Période : ${periodDescription || 'Toutes les périodes'}`, 14, 38);

    const sortedInvoices = [...(invoices || [])].sort((a: any, b: any) => {
      const da = new Date(a?.date_facture || a?.created_at || 0).getTime();
      const db = new Date(b?.date_facture || b?.created_at || 0).getTime();
      return da - db;
    });

    let sumHT = 0;
    let sumTVA = 0;
    let sumTTC = 0;
    const byRate = new Map<string, { tva: number }>();

    const bodyRows = sortedInvoices.map((inv: any) => {
      const amounts = getBestEffortAmounts(inv);
      sumHT += amounts.ht;
      sumTVA += amounts.tva;
      sumTTC += amounts.ttc;
      const rateKey = amounts.vatRatePercent ? `${amounts.vatRatePercent}%` : '0%';
      byRate.set(rateKey, { tva: (byRate.get(rateKey)?.tva || 0) + amounts.tva });

      const dateIso = toYyyyMmDdOrToday(inv?.date_facture || inv?.created_at);
      const frDate = (() => {
        const d = new Date(dateIso);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR');
      })();
      const fournisseur = (inv?.entreprise || 'Non renseigné').toString();
      const libelle = (inv?.description || `Achat - ${fournisseur}`).toString();
      const period = getAccountingPeriodLabel(inv);

      return [
        frDate,
        fournisseur,
        libelle,
        formatDecimalDot(amounts.ht),
        formatDecimalDot(amounts.tva),
        formatDecimalDot(amounts.ttc),
        rateKey,
        period,
      ];
    });

    autoTable(doc as any, {
      startY: 46,
      head: [['Date', 'Fournisseur', 'Libellé', 'HT', 'TVA', 'TTC', 'Taux TVA', 'Période']],
      body: bodyRows,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    });

    const afterTableY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 260;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Totaux', 14, Math.min(afterTableY, 270));
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Total HT : ${formatDecimalDot(sumHT)} €`, 14, Math.min(afterTableY + 6, 276));
    doc.text(`Total TVA : ${formatDecimalDot(sumTVA)} €`, 14, Math.min(afterTableY + 12, 282));
    doc.text(`Total TTC : ${formatDecimalDot(sumTTC)} €`, 14, Math.min(afterTableY + 18, 288));

    const pdfBase64 = doc.output('dataurlstring').split(',')[1];
    const pdfFileName = `ArtisScan_Export_${safePeriodSlug}.pdf`;

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
          Vous trouverez ci-joint <strong style="color: #1e293b;">le PDF comptable, le CSV comptable et le FEC</strong> pour traitement comptable de <strong style="color: #1e293b; font-weight: 600;">${userName || userEmail || 'votre client'}</strong>${periodDescription ? ` pour la période <strong style="color: #FF8C00; font-weight: 600;">${periodDescription}</strong>` : ''}.
        </p>
        
        <div style="background-color: #fff7ed; border-left: 4px solid #FF8C00; padding: 16px; margin: 20px 0; border-radius: 8px;">
          <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
            <strong>📎 Pièces jointes :</strong><br>
            • PDF comptable (récapitulatif A4)<br>
            • CSV comptable (séparateur ;) — prêt import cabinet<br>
            • FEC (format officiel) — prêt validation
          </p>
          <p style="color: #92400e; font-size: 12px; margin: 8px 0 0 0; line-height: 1.4;">
            ✓ CSV : UTF-8 • séparateur ; • montants numériques<br>
            ✓ FEC : séparateur | • dates YYYYMMDD • débit/crédit exclusifs
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

    // Préparer les pièces jointes (PDF + CSV) - base64 inchangé
    const attachments = [
      { filename: pdfFileName, contentBase64: pdfBase64 },
      { filename: accountingCsvFileName, contentBase64: accountingCsvBase64 },
      { filename: fecFileName, contentBase64: fecBase64 },
    ];

    // Envoyer l'email via Brevo (Sendinblue)
    const subject = `Pièces comptables ${userName || userEmail || ''} - ${periodDescription || new Date().toLocaleDateString('fr-FR')}`;
    const brevoRes = await sendMail({
      to: comptableEmail,
      subject,
      html: emailBody,
      attachments,
      replyTo: userEmail || undefined, // Répondre directement au client (comportement identique)
    });

    console.log('✅ Email envoyé avec succès:', brevoRes);

    return NextResponse.json({ 
      success: true, 
      messageId: (brevoRes as any)?.messageId || (brevoRes as any)?.id,
      message: `Email envoyé à ${comptableEmail} avec PDF, CSV comptable et FEC`
    });

  } catch (err: any) {
    console.error('❌ Erreur send-accounting:', err);
    return NextResponse.json({ 
      error: err.message || 'Erreur lors de l\'envoi de l\'email' 
    }, { status: 500 });
  }
}
