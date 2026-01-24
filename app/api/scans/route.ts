import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function toNumber(v: any): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^\d.,\-]/g, '').replace(',', '.');
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  console.log('📤 API /api/scans: Requête d\'upload de facture reçue');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Variables d\'environnement Supabase manquantes');
    return NextResponse.json({ error: 'Configuration manquante' }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Vérifier l'authentification
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.warn('⛔ Pas de token d\'authentification');
      return NextResponse.json({ 
        error: 'Non authentifié',
        message: 'Vous devez être connecté pour uploader des factures'
      }, { status: 401 });
    }

    // Extraire le token
    const token = authHeader.replace('Bearer ', '');
    
    // Vérifier le token avec Supabase
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.warn('⛔ Token invalide ou utilisateur non trouvé');
      return NextResponse.json({ 
        error: 'Non authentifié',
        message: 'Session invalide ou expirée'
      }, { status: 401 });
    }

    console.log('👤 Utilisateur authentifié:', user.id);

    // 2. Vérifier le statut PRO (serveur)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email, is_pro, plan')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Erreur récupération profil:', profileError);
    }

    const isStripePro = (profile as any)?.is_pro === true;

    if (!isStripePro) {
      console.warn('⛔ Upload refusé (non-PRO)', {
        email: profile?.email || user.email,
        plan: (profile as any)?.plan,
        is_pro: (profile as any)?.is_pro,
      });
      return NextResponse.json(
        { error: 'Abonnement requis', message: '⛔ Abonnement PRO requis', redirectTo: '/pricing' },
        { status: 403 }
      );
    }

    console.log('✅ Upload autorisé (PRO)', { user_id: user.id, email: profile?.email || user.email });

    // 3. Traiter l'upload de la facture
    const body = await req.json().catch(() => ({}));
    const invoiceData = body?.invoiceData || null;

    if (!invoiceData) {
      return NextResponse.json({ 
        error: 'Données manquantes',
        message: 'Les données de la facture sont requises'
      }, { status: 400 });
    }

    console.log('✅ Upload autorisé pour utilisateur PRO:', profile?.email || user.email);

    // 3bis. Montants V1 (optionnels mais on évite les NULLs)
    // Supporte les clés "nouvelles" et legacy (migration)
    let ht =
      toNumber(invoiceData.amount_ht) ??
      toNumber(invoiceData.montant_ht) ??
      null;
    let tva =
      toNumber(invoiceData.amount_tva) ??
      toNumber(invoiceData.tva) ??
      null;
    let ttc =
      toNumber(invoiceData.total_amount) ??
      toNumber(invoiceData.montant_ttc) ??
      null;

    // Compléter si possible
    if (ttc === null && ht !== null && tva !== null) ttc = ht + tva;
    if (tva === null && ttc !== null && ht !== null) tva = Math.max(ttc - ht, 0);
    if (ht === null && ttc !== null && tva !== null) ht = Math.max(ttc - tva, 0);

    // V1: jamais NULL en DB (dash/graph)
    const amount_ht = Number.isFinite(ht ?? NaN) ? Number(ht) : 0;
    const amount_tva = Number.isFinite(tva ?? NaN) ? Number(tva) : 0;
    const total_amount = Number.isFinite(ttc ?? NaN) ? Number(ttc) : (amount_ht + amount_tva);
    const modified_manually = invoiceData.modified_manually === true;

    // 4. Insérer la facture dans la base de données
    // ✅ Période optionnelle: date_facture peut être NULL
    let dateFacture: string | null = null;
    const rawDate = (invoiceData as any)?.date_facture ?? (invoiceData as any)?.date ?? null;
    if (rawDate === null) {
      dateFacture = null;
    } else if (typeof rawDate === 'string') {
      const trimmed = rawDate.trim();
      dateFacture = trimmed ? trimmed : null;
    } else {
      dateFacture = null;
    }

    const baseRow: any = {
      user_id: user.id,
      entreprise: (invoiceData.entreprise || '').toString().trim() || 'Non spécifié',
      description: (invoiceData.description || '').toString(),
      categorie: (invoiceData.categorie || 'Autre').toString(),
      date_facture: dateFacture,
      folder_id: invoiceData.folder_id ?? null,
      amount_ht,
      amount_tva,
      total_amount,
      modified_manually,
    };
    const insertRow: any = { ...baseRow, created_at: new Date().toISOString() };

    // Upsert best-effort:
    // - si `invoiceData.id` est fourni => UPDATE (brouillon -> final)
    // - sinon => INSERT
    const scanId = typeof (invoiceData as any)?.id === 'string' ? ((invoiceData as any).id as string) : null;

    // Bonus: source="scan" si la colonne existe (sinon fallback)
    const rowWithSource = { ...baseRow, source: (invoiceData as any)?.source || 'scan' };
    const insertRowWithSource = { ...insertRow, source: (invoiceData as any)?.source || 'scan' };

    let invoice: any = null;
    let insertError: any = null;

    const tryInsert = async (row: any) => {
      const { data, error } = await supabaseAdmin.from('scans').insert([row]).select().single();
      return { data, error };
    };
    const tryUpdate = async (row: any) => {
      const { data, error } = await supabaseAdmin
        .from('scans')
        .update(row)
        .eq('id', scanId as string)
        .eq('user_id', user.id)
        .select()
        .single();
      return { data, error };
    };

    let attempt: { data: any; error: any };
    if (scanId) {
      // UPDATE (brouillon existant)
      attempt = await tryUpdate(rowWithSource);
      const msg = String(attempt.error?.message || '');
      if (attempt.error && (msg.includes("Could not find the 'source' column") || msg.includes('schema cache'))) {
        attempt = await tryUpdate(baseRow);
      }
    } else {
      // INSERT
      attempt = await tryInsert(insertRowWithSource);
      const msg = String(attempt.error?.message || '');
      if (attempt.error && (msg.includes("Could not find the 'source' column") || msg.includes('schema cache'))) {
        attempt = await tryInsert(insertRow);
      }
    }

    invoice = attempt.data;
    insertError = attempt.error;

    if (insertError) {
      console.error('❌ Erreur insertion facture:', insertError);
      return NextResponse.json({ 
        error: 'Erreur d\'enregistrement',
        message: insertError.message
      }, { status: 500 });
    }

    console.log('✅ Facture enregistrée avec succès:', invoice.id, { mode: scanId ? 'update' : 'insert' });

    return NextResponse.json({ 
      success: true,
      invoice,
      message: 'Facture enregistrée avec succès'
    }, { status: 201 });

  } catch (err: any) {
    console.error('❌ Erreur API /api/scans:', err);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      message: err.message || 'Une erreur est survenue'
    }, { status: 500 });
  }
}

// Bloquer les autres méthodes HTTP
export async function GET() {
  return NextResponse.json({ 
    error: 'Méthode non autorisée',
    message: 'Utilisez POST pour uploader une facture'
  }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ 
    error: 'Méthode non autorisée',
    message: 'Utilisez POST pour uploader une facture'
  }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ 
    error: 'Méthode non autorisée',
    message: 'Cette action n\'est pas autorisée'
  }, { status: 405 });
}

