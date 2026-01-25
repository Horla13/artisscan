export type ExportInvoice = {
  id?: string | null;
  entreprise?: string | null;
  description?: string | null;
  categorie?: string | null;
  date_facture?: string | null;
  created_at?: string | null;
  amount_ht?: number | string | null;
  amount_tva?: number | string | null;
  total_amount?: number | string | null;
  vat_rate_percent?: number | string | null;
  numero_facture?: string | null;
  invoice_number?: string | null;
  source?: string | null;
};

type Amounts = {
  ht: number;
  tva: number;
  ttc: number;
  vatRatePercent: number; // 0..100
  estimated: boolean;
  coherent: boolean;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function parseNumberLoose(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v).trim();
  if (!s) return null;
  // Garde chiffres, -, ., , et supprime tout le reste (€, espaces, etc.)
  const cleaned = s.replace(/\s+/g, '').replace(/[^0-9,.\-]/g, '');
  if (!cleaned) return null;
  // Supporte décimale virgule
  const normalized = cleaned.replace(',', '.');
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return n;
}

function toYyyyMmDd(raw?: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function toYyyyMmDdOrToday(raw?: string | null): string {
  return toYyyyMmDd(raw) || toYyyyMmDd(new Date().toISOString())!;
}

export function toYyyyMmDdCompactOrToday(raw?: string | null): string {
  const iso = toYyyyMmDd(raw) || toYyyyMmDd(new Date().toISOString())!;
  return iso.replace(/-/g, '');
}

export function getAccountingPeriodLabel(inv: ExportInvoice): string {
  const iso = toYyyyMmDd(inv.date_facture) || toYyyyMmDd(inv.created_at);
  if (!iso) return 'Sans période';
  return iso.slice(0, 7); // YYYY-MM
}

export function escapeCsvCell(value: any, sep: ';' | '|' = ';'): string {
  const v = (value ?? '').toString().replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  // Pour FEC on doit surtout éviter le séparateur et les retours à la ligne
  if (sep === '|') return v.replaceAll('|', ' ');
  return `"${v.replace(/"/g, '""')}"`;
}

export function formatDecimalDot(n: number | null | undefined): string {
  const safe = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return round2(safe).toFixed(2);
}

function isCoherent(ht: number, tva: number, ttc: number): boolean {
  return Math.abs((ht + tva) - ttc) <= 0.05;
}

export function getBestEffortAmounts(inv: ExportInvoice): Amounts {
  let ht = parseNumberLoose(inv.amount_ht);
  let tva = parseNumberLoose(inv.amount_tva);
  let ttc = parseNumberLoose(inv.total_amount);
  let vatRatePercent = parseNumberLoose(inv.vat_rate_percent);

  let estimated = false;
  const defaultRate = 20;

  // Fallback net: si tout est vide, on exporte quand même (0,0,0)
  if (ht === null && tva === null && ttc === null) {
    return { ht: 0, tva: 0, ttc: 0, vatRatePercent: vatRatePercent ?? 0, estimated: true, coherent: true };
  }

  // Hiérarchie calcul
  if (ht !== null && tva !== null && ttc === null) ttc = ht + tva;
  if (ttc !== null && tva !== null && ht === null) ht = ttc - tva;
  if (ttc !== null && ht !== null && tva === null) tva = ttc - ht;

  // Si seulement HT -> suppose taux (ou défaut 20%)
  if (ht !== null && tva === null && ttc === null) {
    const rate = vatRatePercent ?? defaultRate;
    estimated = vatRatePercent === null;
    tva = ht * (rate / 100);
    ttc = ht + tva;
    vatRatePercent = rate;
  }

  // Si seulement TTC -> infère taux (ou défaut 20%)
  if (ttc !== null && ht === null && tva === null) {
    const rate = vatRatePercent ?? defaultRate;
    estimated = true;
    ht = ttc / (1 + rate / 100);
    tva = ttc - ht;
    vatRatePercent = rate;
  }

  // Normaliser / arrondir
  ht = round2(ht ?? 0);
  tva = round2(tva ?? 0);
  ttc = round2(ttc ?? (ht + tva));

  // Cohérence: si incohérent, on ajuste TVA = TTC - HT (best effort pour équilibre comptable)
  let coherent = isCoherent(ht, tva, ttc);
  if (!coherent && Number.isFinite(ht) && Number.isFinite(ttc)) {
    tva = round2(ttc - ht);
    coherent = isCoherent(ht, tva, ttc);
    estimated = true;
  }

  // Taux TVA
  if (vatRatePercent === null) {
    if (ht > 0 && tva >= 0) {
      vatRatePercent = round2((tva / ht) * 100);
    } else {
      vatRatePercent = 0;
    }
  }

  // Clamp
  vatRatePercent = Math.max(0, Math.min(100, vatRatePercent));

  return { ht, tva, ttc, vatRatePercent, estimated, coherent };
}

export function generateAccountingCSV(invoices: ExportInvoice[]): string {
  const headers = [
    'Date facture',
    'Numéro de facture',
    'Fournisseur / Client',
    'Libellé',
    'Montant HT',
    'Montant TVA',
    'Montant TTC',
    'Taux TVA',
    'Type',
    'Mode de paiement',
    'Période comptable',
    'ID facture interne',
  ];

  const rows = invoices.map((inv) => {
    const dateIso = toYyyyMmDd(inv.date_facture) || toYyyyMmDd(inv.created_at) || '';
    const numero = (inv.numero_facture || inv.invoice_number || '').toString().trim();
    const fournisseur = (inv.entreprise || 'Non renseigné').toString().trim() || 'Non renseigné';
    const libelle = (inv.description || `Achat - ${fournisseur}`).toString().trim();
    const period = getAccountingPeriodLabel(inv);
    const { ht, tva, ttc, vatRatePercent, estimated, coherent } = getBestEffortAmounts(inv);
    const type = 'Achat';
    const mode = '';
    const id = (inv.id || '').toString();

    const statusSuffix = !coherent || estimated ? ' (À vérifier)' : '';

    return [
      escapeCsvCell(dateIso),
      escapeCsvCell(numero),
      escapeCsvCell(fournisseur),
      escapeCsvCell(`${libelle}${statusSuffix}`),
      formatDecimalDot(ht),
      formatDecimalDot(tva),
      formatDecimalDot(ttc),
      escapeCsvCell(vatRatePercent ? `${vatRatePercent}` : ''),
      escapeCsvCell(type),
      escapeCsvCell(mode),
      escapeCsvCell(period),
      escapeCsvCell(id),
    ].join(';');
  });

  // UTF-8 (avec BOM pour Excel)
  const BOM = '\uFEFF';
  return BOM + headers.join(';') + '\n' + rows.join('\n');
}

// ====== FEC FRANCE (pipe |, dates YYYYMMDD, champs fixes) ======
export type FECLigne = {
  JournalCode: string;
  JournalLib: string;
  EcritureNum: string;
  EcritureDate: string; // YYYYMMDD
  CompteNum: string;
  CompteLib: string;
  CompAuxNum: string;
  CompAuxLib: string;
  PieceRef: string;
  PieceDate: string; // YYYYMMDD
  EcritureLib: string;
  Debit: string;
  Credit: string;
  EcritureLet: string;
  DateLet: string;
  ValidDate: string; // YYYYMMDD
  Montantdevise: string;
  Idevise: string;
};

const COMPTE_MAPPING: Record<string, { compte: string; libelle: string; seuilImmo?: number; compteImmo?: string }> = {
  Matériaux: { compte: '601000', libelle: 'Achats de matières premières' },
  Fournitures: { compte: '606000', libelle: 'Achats non stockés de matières et fournitures' },
  Carburant: { compte: '606100', libelle: 'Fournitures non stockables (eau, énergie, carburant)' },
  Outillage: { compte: '606300', libelle: "Fournitures d'entretien et de petit équipement", seuilImmo: 500, compteImmo: '2154000' },
  Services: { compte: '628000', libelle: 'Divers (services)' },
  Abonnements: { compte: '628000', libelle: 'Divers (abonnements)' },
  Restaurant: { compte: '625600', libelle: 'Missions' },
  Location: { compte: '613000', libelle: 'Locations' },
  'Sous-traitance': { compte: '604000', libelle: "Achats d'études et prestations de services" },
};

function getCompteComptable(categorie: string, montantTTC: number): { compte: string; libelle: string } {
  const mapping = COMPTE_MAPPING[categorie];
  if (!mapping) return { compte: '606000', libelle: 'Achats non stockés de matières et fournitures' };
  if (mapping.seuilImmo && mapping.compteImmo && montantTTC > mapping.seuilImmo) {
    return { compte: mapping.compteImmo, libelle: 'Matériel industriel' };
  }
  return { compte: mapping.compte, libelle: mapping.libelle };
}

function normalizeAuxCode(label: string, fallbackId: string, maxLen = 20): string {
  const clean = (label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 12);
  const suffix = (fallbackId || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-4) || '0000';
  const base = `FOUR_${clean || 'X'}_${suffix}`;
  return base.substring(0, maxLen);
}

export function generateFEC(invoices: ExportInvoice[]): string {
  const header = [
    'JournalCode',
    'JournalLib',
    'EcritureNum',
    'EcritureDate',
    'CompteNum',
    'CompteLib',
    'CompAuxNum',
    'CompAuxLib',
    'PieceRef',
    'PieceDate',
    'EcritureLib',
    'Debit',
    'Credit',
    'EcritureLet',
    'DateLet',
    'ValidDate',
    'Montantdevise',
    'Idevise',
  ].join('|');

  const lignes: FECLigne[] = [];

  invoices.forEach((inv, idx) => {
    const dateIso = toYyyyMmDd(inv.date_facture) || toYyyyMmDd(inv.created_at);
    const dateYmd = toYyyyMmDdCompactOrToday(dateIso);

    const fournisseur = (inv.entreprise || 'Fournisseur').toString().trim() || 'Fournisseur';
    const categorie = (inv.categorie || 'Autre').toString();
    const description = (inv.description || `Achat - ${fournisseur}`).toString();

    const amounts = getBestEffortAmounts(inv);
    const { ht, tva, ttc } = amounts;
    const coherent = amounts.coherent;
    const estimated = amounts.estimated;

    const ecritureNum = `AC${dateYmd}${String(idx + 1).padStart(4, '0')}`;
    const pieceRefRaw = (inv.numero_facture || inv.invoice_number || '').toString().trim();
    const pieceRef = (pieceRefRaw ? pieceRefRaw : `SCAN${(inv.id || '').toString().slice(-6) || String(idx + 1).padStart(6, '0')}`)
      .replace(/\s+/g, '')
      .substring(0, 20);

    const compAuxNum = normalizeAuxCode(fournisseur, (inv.id || '').toString(), 20);
    const compteCharge = getCompteComptable(categorie, ttc);

    const libSuffix = !coherent || estimated ? ' A_VERIFIER' : '';
    const ecritureLib = `${description}`.slice(0, 80) + libSuffix;

    // 1) Débit charge
    lignes.push({
      JournalCode: 'AC',
      JournalLib: 'Achats',
      EcritureNum: ecritureNum,
      EcritureDate: dateYmd,
      CompteNum: compteCharge.compte,
      CompteLib: compteCharge.libelle,
      CompAuxNum: '',
      CompAuxLib: '',
      PieceRef: pieceRef,
      PieceDate: dateYmd,
      EcritureLib: escapeCsvCell(ecritureLib, '|'),
      Debit: ht > 0 ? formatDecimalDot(ht) : '',
      Credit: '',
      EcritureLet: '',
      DateLet: '',
      ValidDate: dateYmd,
      Montantdevise: '',
      Idevise: 'EUR',
    });

    // 2) Débit TVA déductible si > 0
    if (tva > 0) {
      lignes.push({
        JournalCode: 'AC',
        JournalLib: 'Achats',
        EcritureNum: ecritureNum,
        EcritureDate: dateYmd,
        CompteNum: '445660',
        CompteLib: 'TVA déductible sur autres biens et services',
        CompAuxNum: '',
        CompAuxLib: '',
        PieceRef: pieceRef,
        PieceDate: dateYmd,
        EcritureLib: escapeCsvCell(`TVA - ${ecritureLib}`.slice(0, 80), '|'),
        Debit: formatDecimalDot(tva),
        Credit: '',
        EcritureLet: '',
        DateLet: '',
        ValidDate: dateYmd,
        Montantdevise: '',
        Idevise: 'EUR',
      });
    }

    // 3) Crédit fournisseur TTC
    lignes.push({
      JournalCode: 'AC',
      JournalLib: 'Achats',
      EcritureNum: ecritureNum,
      EcritureDate: dateYmd,
      CompteNum: '401000',
      CompteLib: 'Fournisseurs',
      CompAuxNum: compAuxNum,
      CompAuxLib: escapeCsvCell(fournisseur, '|'),
      PieceRef: pieceRef,
      PieceDate: dateYmd,
      EcritureLib: escapeCsvCell(ecritureLib, '|'),
      Debit: '',
      Credit: ttc > 0 ? formatDecimalDot(ttc) : '',
      EcritureLet: '',
      DateLet: '',
      ValidDate: dateYmd,
      Montantdevise: '',
      Idevise: 'EUR',
    });
  });

  const lines = lignes.map((l) => {
    // Débit OU Crédit, jamais les deux
    const debit = l.Debit && l.Credit ? '' : l.Debit;
    const credit = l.Debit && l.Credit ? '' : l.Credit;
    return [
      l.JournalCode,
      l.JournalLib,
      l.EcritureNum,
      l.EcritureDate,
      l.CompteNum,
      l.CompteLib,
      l.CompAuxNum,
      l.CompAuxLib,
      l.PieceRef,
      l.PieceDate,
      l.EcritureLib,
      debit,
      credit,
      l.EcritureLet,
      l.DateLet,
      l.ValidDate,
      l.Montantdevise,
      l.Idevise,
    ]
      .map((x) => (x ?? '').toString().replace(/\r?\n/g, ' ').replaceAll('|', ' ').trim())
      .join('|');
  });

  return header + '\n' + lines.join('\n');
}


