import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Client Supabase pour vérifier les limites
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

    // Récupérer le body de la requête
    const body = await request.json();
    const { image, imageBase64 } = body;
    const imageData = image || imageBase64;

    // Vérifier que l'image est fournie
    if (!imageData) {
      return NextResponse.json(
        { error: 'Aucune image fournie. Veuillez prendre une photo de votre facture.' },
        { status: 400 }
      );
    }

    // Vérifier que la clé API est configurée
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ Clé API OpenAI manquante');
      return NextResponse.json(
        { error: 'Service temporairement indisponible. Veuillez réessayer dans quelques instants.' },
        { status: 500 }
      );
    }

    // Préparer l'image pour l'API OpenAI
    // Si l'image est déjà en format data URL, on l'utilise directement
    // Sinon, on ajoute le préfixe data:image
    const imageUrl = imageData.startsWith('data:')
      ? imageData
      : `data:image/jpeg;base64,${imageData}`;

    // Heuristique anti “photo trop petite/floue” : base64 trop court => on stoppe vite (message humain)
    // (évite de payer un appel OpenAI pour une image inutilisable)
    const rawBase64 = imageUrl.includes('base64,') ? imageUrl.split('base64,')[1] : imageData;
    const approxBytes = Math.floor((rawBase64.length * 3) / 4);
    if (approxBytes < 18 * 1024) {
      return NextResponse.json(
        { error: 'Photo trop petite ou trop floue. Reprenez la photo plus près, bien nette et bien éclairée.' },
        { status: 400 }
      );
    }

    // Appeler l'API OpenAI avec GPT-4o pour analyser l'image
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyse cette image de facture et extrais les informations suivantes au format JSON strict :
- entreprise : le nom de l'entreprise/fournisseur
- date : la date de la facture (format YYYY-MM-DD si possible)
- montant_ht : le montant hors taxes (nombre uniquement, sans symbole)
- total_amount : le montant toutes taxes comprises (nombre uniquement, sans symbole)
- description : une brève description des services/produits
- categorie : classe la facture dans une de ces catégories : "Matériaux", "Carburant", "Restaurant", "Outillage", "Sous-traitance", "Fournitures", "Location", "Autre"

Réponds UNIQUEMENT avec un objet JSON valide, sans texte supplémentaire, sans markdown, sans code blocks. Format de réponse attendu :
{
  "entreprise": "string",
  "date": "YYYY-MM-DD",
  "montant_ht": number,
  "total_amount": number,
  "description": "string",
  "categorie": "string"
}`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    // Extraire la réponse JSON
    const content = response.choices[0]?.message?.content;

    // Log pour débogage
    console.log('🤖 Réponse brute de l\'IA:', content);

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

    // Nettoyer et valider les montants
    const cleanAmount = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        // Retirer €, espaces, et autres caractères non numériques sauf . et ,
        const cleaned = value.replace(/[^\d.,\-]/g, '').replace(',', '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      }
      return 0;
    };

    // Appliquer le nettoyage aux montants
    extractedData.montant_ht = cleanAmount(extractedData.montant_ht || extractedData.montantHT);
    extractedData.total_amount = cleanAmount(extractedData.total_amount || extractedData.totalAmount || extractedData.montant_ttc || extractedData.montantTTC);

    // Assurer que la catégorie est présente
    if (!extractedData.categorie) {
      extractedData.categorie = 'Autre';
    }

    console.log('✅ Données extraites et nettoyées:', extractedData);

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
