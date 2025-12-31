import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Récupérer le body de la requête
    const body = await request.json();
    const { imageBase64 } = body;

    // Vérifier que l'image est fournie
    if (!imageBase64) {
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
    const imageUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

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
- nomFournisseur : le nom du fournisseur
- date : la date de la facture (format YYYY-MM-DD si possible)
- montantHT : le montant hors taxes (nombre uniquement, sans symbole)
- montantTVA : le montant de la TVA (nombre uniquement, sans symbole)
- montantTTC : le montant toutes taxes comprises (nombre uniquement, sans symbole)

Réponds UNIQUEMENT avec un objet JSON valide, sans texte supplémentaire, sans markdown, sans code blocks. Format de réponse attendu :
{
  "nomFournisseur": "string",
  "date": "YYYY-MM-DD",
  "montantHT": number,
  "montantTVA": number,
  "montantTTC": number
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
    extractedData.montantHT = cleanAmount(extractedData.montantHT);
    extractedData.montantTVA = cleanAmount(extractedData.montantTVA);
    extractedData.montantTTC = cleanAmount(extractedData.montantTTC);

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
