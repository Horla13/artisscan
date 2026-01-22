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

function isCoherent(ht: number, tva: number, ttc: number): boolean {
  return Math.abs((ht + tva) - ttc) <= 0.05;
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
      .select('email, is_pro, plan, stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Erreur récupération profil:', profileError);
    }

    const isPro = profile?.is_pro === true;
    if (!isPro) {
      console.warn('⛔ Upload refusé (non-PRO)', {
        email: profile?.email || user.email,
        is_pro: profile?.is_pro,
        plan: profile?.plan,
        stripe_customer_id: profile?.stripe_customer_id,
        stripe_subscription_id: profile?.stripe_subscription_id,
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

    // ✅ Standardiser et valider les champs monétaires
    // On accepte temporairement les anciens noms, mais on écrit en DB UNIQUEMENT:
    // - amount_ht
    // - amount_tva
    // - total_amount (TTC)
    const ht =
      toNumber(invoiceData.amount_ht) ??
      toNumber(invoiceData.montant_ht) ??
      null;
    const tva =
      toNumber(invoiceData.amount_tva) ??
      toNumber(invoiceData.tva) ??
      null;
    const ttc =
      toNumber(invoiceData.total_amount) ??
      toNumber(invoiceData.amount_ttc) ??
      toNumber(invoiceData.montant_ttc) ??
      null;

    // 🔒 Protection demandée: total_amount obligatoire
    if (ttc === null) {
      return NextResponse.json(
        {
          error: 'Montant TTC manquant',
          message: 'Veuillez renseigner le montant TTC (total_amount) avant de valider la facture.',
        },
        { status: 400 }
      );
    }

    // Compléter les manquants côté serveur
    const finalHt = ht ?? (tva !== null ? Math.max(ttc - tva, 0) : null);
    const finalTva = tva ?? (finalHt !== null ? Math.max(ttc - finalHt, 0) : null);

    if (finalHt === null || finalTva === null) {
      return NextResponse.json(
        {
          error: 'Montants incomplets',
          message: 'Veuillez renseigner au minimum HT et TVA (ou HT), en plus du TTC, pour enregistrer la facture.',
        },
        { status: 400 }
      );
    }

    if (!isCoherent(finalHt, finalTva, ttc)) {
      return NextResponse.json(
        {
          error: 'Montants incohérents',
          message: `Montants incohérents: HT (${finalHt.toFixed(2)}€) + TVA (${finalTva.toFixed(2)}€) ≠ TTC (${ttc.toFixed(2)}€).`,
        },
        { status: 400 }
      );
    }

    console.log('✅ Upload autorisé pour utilisateur PRO:', profile?.email || user.email);

    // 4. Insérer la facture dans la base de données
    const { data: invoice, error: insertError } = await supabaseAdmin
      .from('scans')
      .insert([{
        user_id: user.id,
        entreprise: (invoiceData.entreprise || '').toString().trim() || 'Non spécifié',
        description: (invoiceData.description || '').toString(),
        categorie: (invoiceData.categorie || 'Autre').toString(),
        date_facture: invoiceData.date_facture || invoiceData.date || new Date().toISOString().slice(0, 10),
        folder_id: invoiceData.folder_id ?? null,
        modified_manually: invoiceData.modified_manually === true,
        amount_ht: finalHt,
        amount_tva: finalTva,
        total_amount: ttc,
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erreur insertion facture:', insertError);
      return NextResponse.json({ 
        error: 'Erreur d\'enregistrement',
        message: insertError.message
      }, { status: 500 });
    }

    console.log('✅ Facture enregistrée avec succès:', invoice.id);

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

