import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const isDev = process.env.NODE_ENV !== 'production';

// Client Supabase pour vérifier les limites
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AmountsVerification = 'verified' | 'to_verify' | 'incomplete';

function cleanAmount(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[^\d.,\-]/g, '').replace(',', '.').trim();
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function cleanVatRatePercent(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    // Accepter 0.2 ou 20
    if (value > 0 && value <= 1) return round2(value * 100);
    if (value >= 0 && value <= 100) return round2(value);
    return null;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.').trim();
    const num = parseFloat(cleaned);
    if (!Number.isFinite(num)) return null;
    if (num > 0 && num <= 1) return round2(num * 100);
    if (num >= 0 && num <= 100) return round2(num);
  }
  return null;
}

function checkCoherence(ht: number, tva: number, ttc: number): boolean {
  const delta = Math.abs((ht + tva) - ttc);
  // Tolérance comptable: 2 centimes ou 0.5% du TTC (au choix du plus grand)
  const tol = Math.max(0.02, Math.abs(ttc) * 0.005);
  return delta <= tol;
}

function deriveAmounts(input: {
  ht: number | null;
  tva: number | null;
  ttc: number | null;
  net: number | null;
  vatRatePercent: number | null;
}): {
  amount_ht: number | null;
  amount_tva: number | null;
  total_amount: number | null;
  vat_rate_percent: number | null;
  amounts_verification: AmountsVerification;
  amounts_reason: string;
} {
  let { ht, tva, ttc, net, vatRatePercent } = input;
  // “Net à payer” est un alias de TTC quand TTC n'est pas explicitement présent
  if (ttc === null && net !== null) ttc = net;

  // Normaliser / arrondir si déjà présents
  ht = ht !== null ? round2(ht) : null;
  tva = tva !== null ? round2(tva) : null;
  ttc = ttc !== null ? round2(ttc) : null;
  const rate = vatRatePercent !== null ? vatRatePercent / 100 : null;

  // 1) HT + TVA + TTC
  if (ht !== null && tva !== null && ttc !== null) {
    const ok = checkCoherence(ht, tva, ttc);
    return {
      amount_ht: ht,
      amount_tva: tva,
      total_amount: ttc,
      vat_rate_percent: vatRatePercent,
      amounts_verification: ok ? 'verified' : 'to_verify',
      amounts_reason: ok ? 'Montants cohérents (HT + TVA ≈ TTC).' : 'Incohérence détectée (HT + TVA ≠ TTC). À vérifier.',
    };
  }

  // 2) HT + TVA -> TTC
  if (ht !== null && tva !== null && ttc === null) {
    const computedTtc = round2(ht + tva);
    return {
      amount_ht: ht,
      amount_tva: tva,
      total_amount: computedTtc,
      vat_rate_percent: vatRatePercent,
      amounts_verification: 'verified',
      amounts_reason: 'TTC calculé automatiquement (HT + TVA).',
    };
  }

  // 3) TTC + TVA -> HT
  if (ttc !== null && tva !== null && ht === null) {
    const computedHt = round2(ttc - tva);
    return {
      amount_ht: computedHt,
      amount_tva: tva,
      total_amount: ttc,
      vat_rate_percent: vatRatePercent,
      amounts_verification: computedHt >= 0 ? 'verified' : 'to_verify',
      amounts_reason: computedHt >= 0 ? 'HT calculé automatiquement (TTC - TVA).' : 'HT calculé négatif (TTC - TVA). À vérifier.',
    };
  }

  // 4) HT seul -> TVA + TTC (taux explicite sinon 20% par défaut, mais à vérifier)
  if (ht !== null && tva === null && ttc === null) {
    const usedRate = rate ?? 0.2;
    const computedTva = round2(ht * usedRate);
    const computedTtc = round2(ht + computedTva);
    const usedRatePercent = round2(usedRate * 100);
    const verification: AmountsVerification = rate ? 'verified' : 'to_verify';
    const reason = rate
      ? `TVA et TTC calculés avec le taux détecté (${usedRatePercent}%).`
      : `TVA et TTC calculés avec un taux par défaut (${usedRatePercent}%). À vérifier.`;
    return {
      amount_ht: ht,
      amount_tva: computedTva,
      total_amount: computedTtc,
      vat_rate_percent: vatRatePercent ?? usedRatePercent,
      amounts_verification: verification,
      amounts_reason: reason,
    };
  }

  // 5) TTC seul -> si taux trouvé: HT/TVA calculés, sinon incomplet avec justification
  if (ttc !== null && ht === null && tva === null) {
    if (rate) {
      const computedHt = round2(ttc / (1 + rate));
      const computedTva = round2(ttc - computedHt);
      return {
        amount_ht: computedHt,
        amount_tva: computedTva,
        total_amount: ttc,
        vat_rate_percent: vatRatePercent,
        amounts_verification: 'to_verify',
        amounts_reason: `HT/TVA calculés depuis le TTC avec le taux détecté (${vatRatePercent}%). À vérifier.`,
      };
    }
    return {
      amount_ht: null,
      amount_tva: null,
      total_amount: ttc,
      vat_rate_percent: vatRatePercent,
      amounts_verification: 'incomplete',
      amounts_reason: 'Seul le TTC a été détecté. Taux TVA introuvable → HT/TVA non calculés.',
    };
  }

  // Cas fallback: incomplet
  return {
    amount_ht: ht,
    amount_tva: tva,
    total_amount: ttc,
    vat_rate_percent: vatRatePercent,
    amounts_verification: 'incomplete',
    amounts_reason: 'Montants incomplets. Certains champs sont introuvables sur le document.',
  };
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'accès PRO côté serveur via JWT Supabase
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Session invalide ou expirée' },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_pro, plan')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ /api/analyze: erreur profil', profileError);
      return NextResponse.json({ error: 'Erreur de vérification' }, { status: 500 });
    }

    const isStripePro = (profile as any)?.is_pro === true;

    if (!isStripePro) {
      console.warn('⛔ /api/analyze: accès refusé (non-PRO)', {
        user_id: user.id,
        plan: (profile as any)?.plan,
        is_pro: (profile as any)?.is_pro,
      });
      return NextResponse.json(
        { error: 'Abonnement requis', redirectTo: '/pricing' },
        { status: 403 }
      );
    }

    // Récupérer le body de la requête (multipart file recommandé; JSON legacy accepté)
    let kind: 'pdf' | 'image' = 'image';
    let fileBytes: ArrayBuffer | null = null;
    let fileMime: string | null = null;
    let imageDataLegacy: string | null = null;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const k = String(form.get('kind') || 'image');
      kind = k === 'pdf' ? 'pdf' : 'image';
      const file = form.get('file');
      if (!file || typeof (file as any).arrayBuffer !== 'function') {
        return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
      }
      fileMime = (file as any).type || null;
      fileBytes = await (file as any).arrayBuffer();
    } else {
      const body = await request.json().catch(() => ({}));
      const { image, imageBase64 } = body || {};
      imageDataLegacy = image || imageBase64 || null;
      if (!imageDataLegacy) {
        return NextResponse.json(
          { error: 'Aucun fichier fourni. Veuillez sélectionner un PDF ou une image.' },
          { status: 400 }
        );
      }
    }

    // Vérifier que la clé API est configurée
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ Clé API OpenAI manquante');
      return NextResponse.json(
        { error: 'Service temporairement indisponible. Veuillez réessayer dans quelques instants.' },
        { status: 500 }
      );
    }

    let imageUrl: string | null = null;
    let pdfText: string | null = null;

    if (fileBytes) {
      if (kind === 'pdf') {
        // PDF: extraction texte multi-pages côté serveur (pas de PDF.js côté client)
        const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf');
        const doc = await pdfjs.getDocument({ data: fileBytes, disableWorker: true }).promise;
        const pageCount = doc.numPages || 0;
        let out = '';
        for (let i = 1; i <= pageCount; i++) {
          const page = await doc.getPage(i);
          const tc = await page.getTextContent();
          const pageText = (tc?.items || [])
            .map((it: any) => (it?.str || '').toString())
            .filter(Boolean)
            .join(' ');
          out += pageText + '\n';
        }
        pdfText = out.trim();
        if (!pdfText) {
          return NextResponse.json(
            { error: 'Impossible de lire le texte du PDF. Essayez une photo (JPG/PNG) plus nette.' },
            { status: 400 }
          );
        }
        // Limiter la taille envoyée au modèle
        if (pdfText.length > 12000) pdfText = pdfText.slice(0, 12000);
      } else {
        // Image: convertir en data URL pour Vision
        const buf = Buffer.from(fileBytes);
        const mime = fileMime || 'image/jpeg';
        const b64 = buf.toString('base64');
        imageUrl = `data:${mime};base64,${b64}`;
        if (buf.byteLength < 18 * 1024) {
          return NextResponse.json(
            { error: 'Photo trop petite ou trop floue. Reprenez la photo plus près, bien nette et bien éclairée.' },
            { status: 400 }
          );
        }
      }
    } else if (imageDataLegacy) {
      // Legacy JSON: image base64 -> data URL
      imageUrl = imageDataLegacy.startsWith('data:')
        ? imageDataLegacy
        : `data:image/jpeg;base64,${imageDataLegacy}`;
      const rawBase64 = imageUrl.includes('base64,') ? imageUrl.split('base64,')[1] : imageDataLegacy;
      const approxBytes = Math.floor((rawBase64.length * 3) / 4);
      if (approxBytes < 18 * 1024) {
        return NextResponse.json(
          { error: 'Photo trop petite ou trop floue. Reprenez la photo plus près, bien nette et bien éclairée.' },
          { status: 400 }
        );
      }
    }

    // Appeler OpenAI:
    // - image -> vision
    // - pdf -> texte extrait
    const prompt = `Tu es un expert comptable. Extrais explicitement les montants comptables.

RÈGLES:
- Cherche d'abord les libellés: "Total HT", "Montant HT", "TVA", "Total TVA", "Total TTC", "Net à payer".
- Ne te base jamais sur "le plus gros chiffre".
- Si un champ n’est pas visible, mets null (pas 0).

Réponds UNIQUEMENT avec un JSON strict (sans markdown).
Format attendu:
{
  "entreprise": "string|null",
  "date": "YYYY-MM-DD|null",
  "description": "string|null",
  "categorie": "Matériaux"|"Carburant"|"Restaurant"|"Outillage"|"Sous-traitance"|"Fournitures"|"Location"|"Autre",
  "totaux": {
    "ht": number|null,
    "tva": number|null,
    "ttc": number|null,
    "net_a_payer": number|null,
    "taux_tva_percent": number|null
  }
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        pdfText
          ? { role: 'user', content: `${prompt}\n\nTEXTE PDF (extrait):\n${pdfText}` }
          : {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageUrl! } },
              ],
            },
      ] as any,
      response_format: { type: 'json_object' },
      max_tokens: 600,
    });

    // Extraire la réponse JSON
    const content = response.choices[0]?.message?.content;

    // Log pour débogage (dev uniquement)
    if (isDev) console.log('🤖 Réponse brute de l\'IA:', content);

    if (!content) {
      return NextResponse.json(
        { error: 'Désolé, l\'IA n\'a pas pu analyser cette photo. Veuillez réessayer avec une photo plus nette.' },
        { status: 500 }
      );
    }

    // Parser le JSON de la réponse avec robustesse
    let extractedData;
    try {
      // Étape 1: Essayer de parser directement
      extractedData = JSON.parse(content);
    } catch (parseError) {
      try {
        // Étape 2: Nettoyer les code blocks markdown
        let cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Étape 3: Utiliser une regex pour extraire uniquement le bloc JSON {...}
        const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedContent = jsonMatch[0];
        }
        
        console.log('📝 JSON nettoyé:', cleanedContent);
        extractedData = JSON.parse(cleanedContent);
      } catch (secondParseError) {
        console.error('❌ Erreur de parsing JSON:', secondParseError);
        console.error('📄 Contenu reçu:', content);
        return NextResponse.json(
          { error: 'Désolé, l\'IA n\'a pas réussi à lire cette photo. Recommencez en étant plus proche de la facture.' },
          { status: 500 }
        );
      }
    }

    // Construire les candidats "comptables" + appliquer la logique déterministe (priorités + calculs + cohérence)
    const totaux = extractedData?.totaux || {};
    const ht = cleanAmount(totaux.ht ?? extractedData.amount_ht ?? extractedData.montant_ht);
    const tva = cleanAmount(totaux.tva ?? extractedData.amount_tva ?? extractedData.tva);
    const ttc = cleanAmount(totaux.ttc ?? extractedData.total_amount ?? extractedData.montant_ttc);
    const net = cleanAmount(totaux.net_a_payer);
    const vatRatePercent = cleanVatRatePercent(totaux.taux_tva_percent ?? extractedData.vat_rate_percent ?? extractedData.taux_tva);

    const derived = deriveAmounts({ ht, tva, ttc, net, vatRatePercent });

    extractedData.amount_ht = derived.amount_ht;
    extractedData.amount_tva = derived.amount_tva;
    extractedData.total_amount = derived.total_amount;
    extractedData.vat_rate_percent = derived.vat_rate_percent;
    extractedData.amounts_verification = derived.amounts_verification;
    extractedData.amounts_reason = derived.amounts_reason;

    // Ne pas retourner des champs legacy / ambiguës côté client
    delete extractedData.montant_ht;
    delete extractedData.montantHT;
    delete extractedData.montant_ttc;
    delete extractedData.montantTTC;
    delete extractedData.totalAmount;
    delete extractedData.tva;
    delete extractedData.amount_ht_raw;
    delete extractedData.amount_tva_raw;
    delete extractedData.total_amount_raw;

    // Ne pas renvoyer les champs "totaux" (debug) côté client
    delete extractedData.totaux;

    // Assurer que la catégorie est présente
    if (!extractedData.categorie) {
      extractedData.categorie = 'Autre';
    }

    if (isDev) console.log('✅ Données extraites et nettoyées:', extractedData);

    // Retourner les données extraites
    return NextResponse.json(extractedData, { status: 200 });
  } catch (error: unknown) {
    console.error('❌ Erreur lors de l\'analyse de l\'image:', error);
    
    // Gérer les erreurs spécifiques de l'API OpenAI
    if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as { status?: number; message?: string };
      console.error('❌ Erreur API OpenAI:', apiError);
      
      // Messages d'erreur conviviaux selon le type d'erreur
      if (apiError.status === 429) {
        return NextResponse.json(
          { error: 'Trop de demandes en même temps. Veuillez patienter 30 secondes et réessayer.' },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: 'L\'analyse de l\'image a échoué. Assurez-vous que la photo est nette et bien éclairée.' },
        { status: apiError.status || 500 }
      );
    }

    // Gérer les autres erreurs
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('❌ Erreur inattendue:', errorMessage);
    
    return NextResponse.json(
      { error: 'Une erreur s\'est produite. Veuillez réessayer avec une photo de meilleure qualité.' },
      { status: 500 }
    );
  }
}
