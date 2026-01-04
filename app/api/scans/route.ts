import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // 2. Vérifier le statut PRO
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_pro, plan, email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Erreur récupération profil:', profileError);
      return NextResponse.json({ 
        error: 'Erreur de vérification',
        message: 'Impossible de vérifier votre statut d\'abonnement'
      }, { status: 500 });
    }

    console.log('📊 Profil utilisateur:', { 
      email: profile.email, 
      is_pro: profile.is_pro,
      plan: profile.plan 
    });

    // 🔒 BLOCAGE STRICT : is_pro doit être true
    if (!profile.is_pro) {
      console.warn('⛔ ACCÈS REFUSÉ: Utilisateur non-PRO tente d\'uploader');
      console.warn('   Email:', profile.email);
      console.warn('   is_pro:', profile.is_pro);
      console.warn('   plan:', profile.plan);
      
      return NextResponse.json({ 
        error: 'Abonnement requis',
        message: '⛔ Abonnement requis pour accéder à cette fonctionnalité',
        isPro: false,
        redirectTo: '/pricing'
      }, { status: 403 });
    }

    // 3. Traiter l'upload de la facture
    const body = await req.json();
    const { invoiceData } = body;

    if (!invoiceData) {
      return NextResponse.json({ 
        error: 'Données manquantes',
        message: 'Les données de la facture sont requises'
      }, { status: 400 });
    }

    console.log('✅ Upload autorisé pour utilisateur PRO:', profile.email);

    // 4. Insérer la facture dans la base de données
    const { data: invoice, error: insertError } = await supabaseAdmin
      .from('scans')
      .insert([{
        ...invoiceData,
        user_id: user.id,
        created_at: new Date().toISOString()
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

