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

    // ========== CORPS DE L'EMAIL (transactionnel premium, compatible Gmail/Outlook/Apple Mail) ==========
    const siteUrl =
      (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.artisscan.fr').toString().replace(/\/$/, '');
    // Le comptable reçoit déjà les pièces jointes. Le CTA sert de point d’entrée “propre”.
    const downloadUrl = siteUrl;

    const brand = '#FF6600';
    const bg = '#F8FAFC';
    const cardBorder = '#E2E8F0';
    const text = '#0F172A';
    const muted = '#64748B';

    const clientLabel = (companyName || userName || userEmail || 'Client ArtisScan').toString().trim();
    const periodLabel = (periodDescription || 'Toutes les périodes').toString();
    const exportDateLabel = exportDate.toLocaleDateString('fr-FR');

    const emailBody = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Documents comptables disponibles</title>
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
                            <img src="${siteUrl}/icon-rounded.svg" width="36" height="36" alt="ArtisScan" style="display:block;border:0;outline:none;text-decoration:none;border-radius:10px;" />
                          </td>
                          <td style="vertical-align:middle;">
                            <div style="font-size:14px;font-weight:800;color:${text};line-height:18px;">ArtisScan</div>
                            <div style="font-size:12px;color:${muted};line-height:16px;">Documents comptables</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <div style="font-size:12px;color:${muted};line-height:16px;">${exportDateLabel}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Carte -->
            <tr>
              <td style="background:#FFFFFF;border:1px solid ${cardBorder};border-radius:18px;box-shadow:0 10px 30px rgba(15,23,42,0.06);overflow:hidden;">
                <!-- Séparateur fin -->
                <div style="height:1px;background:${cardBorder};line-height:1px;font-size:1px;">&nbsp;</div>

                <div style="padding:28px 26px 14px 26px;">
                  <div style="font-size:20px;font-weight:800;color:${text};line-height:28px;">
                    Documents comptables disponibles
                  </div>
                  <div style="margin-top:10px;font-size:14px;color:${muted};line-height:22px;">
                    Un client ArtisScan a partagé des documents comptables avec vous.
                    <br />
                    <strong style="color:${text};">Aucun compte n’est requis</strong> pour accéder aux documents.
                  </div>
                </div>

                <!-- Bloc récap -->
                <div style="padding:0 26px 0 26px;">
                  <div style="background:#F1F5F9;border:1px solid ${cardBorder};border-radius:14px;padding:16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="font-size:12px;color:${muted};padding:0 0 8px 0;">Entreprise</td>
                        <td align="right" style="font-size:12px;color:${text};font-weight:700;padding:0 0 8px 0;">${clientLabel}</td>
                      </tr>
                      <tr>
                        <td style="font-size:12px;color:${muted};padding:8px 0;">Période</td>
                        <td align="right" style="font-size:12px;color:${text};font-weight:700;padding:8px 0;">${periodLabel}</td>
                      </tr>
                      <tr>
                        <td style="font-size:12px;color:${muted};padding:8px 0;">Documents</td>
                        <td align="right" style="font-size:12px;color:${text};font-weight:700;padding:8px 0;">CSV / FEC / PDF</td>
                      </tr>
                      <tr>
                        <td style="font-size:12px;color:${muted};padding:8px 0 0 0;">Date d’export</td>
                        <td align="right" style="font-size:12px;color:${text};font-weight:700;padding:8px 0 0 0;">${exportDateLabel}</td>
                      </tr>
                    </table>
                  </div>
                </div>

                <!-- CTA -->
                <div style="padding:18px 26px 8px 26px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding:8px 0 6px 0;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            <td bgcolor="${brand}" style="border-radius:14px;">
                              <a href="${downloadUrl}" target="_blank" rel="noopener noreferrer"
                                style="display:inline-block;background:${brand};color:#FFFFFF;text-decoration:none;font-weight:800;font-size:14px;line-height:18px;padding:14px 22px;border-radius:14px;">
                                Accéder aux documents
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding:8px 0 16px 0;">
                        <div style="font-size:12px;color:${muted};line-height:18px;">
                          Les documents sont également inclus en pièces jointes (PDF, CSV comptable, FEC).
                        </div>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- Footer carte -->
                <div style="padding:0 26px 22px 26px;">
                  <div style="border-top:1px solid ${cardBorder};padding-top:14px;">
                    <div style="font-size:12px;color:${muted};line-height:18px;">
                      Email envoyé via ArtisScan – Solution de gestion comptable pour artisans.
                      <br />
                      <a href="${siteUrl}" style="color:${brand};text-decoration:none;font-weight:700;">www.artisscan.fr</a>
                      <span style="color:#CBD5E1;"> • </span>
                      <a href="${siteUrl}/legal/mentions-legales" style="color:${muted};text-decoration:none;">Mentions légales</a>
                    </div>
                  </div>
                </div>
              </td>
            </tr>

            <!-- footer extérieur -->
            <tr>
              <td align="center" style="padding:16px 6px 0 6px;">
                <div style="font-size:11px;color:#94A3B8;line-height:16px;">
                  Besoin d’aide ? <a href="mailto:contact@artisscan.fr" style="color:${brand};text-decoration:none;font-weight:700;">contact@artisscan.fr</a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
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
    const msg = String(err?.message || '');
    if (
      msg.includes('export FEC') ||
      msg.includes('date de facture') ||
      msg.includes('fournisseur') ||
      msg.includes('montants')
    ) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ 
      error: err.message || 'Erreur lors de l\'envoi de l\'email' 
    }, { status: 500 });
  }
}
