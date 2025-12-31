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
        { error: 'Image en base64 requise' },
        { status: 400 }
      );
    }

    // Vérifier que la clé API est configurée
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Clé API OpenAI non configurée' },
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

    if (!content) {
      return NextResponse.json(
        { error: 'Aucune réponse de l\'IA' },
        { status: 500 }
      );
    }

    // Parser le JSON de la réponse
    let extractedData;
    try {
      extractedData = JSON.parse(content);
    } catch (parseError) {
      // Si le parsing échoue, essayer de nettoyer la réponse
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(cleanedContent);
    }

    // Retourner les données extraites
    return NextResponse.json(extractedData, { status: 200 });
  } catch (error: unknown) {
    console.error('Erreur lors de l\'analyse de l\'image:', error);
    
    // Gérer les erreurs spécifiques de l'API OpenAI
    if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as { status?: number; message?: string };
      return NextResponse.json(
        { error: `Erreur API OpenAI: ${apiError.message || 'Erreur inconnue'}` },
        { status: apiError.status || 500 }
      );
    }

    // Gérer les autres erreurs
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json(
      { error: `Erreur lors de l'analyse de l'image: ${errorMessage}` },
      { status: 500 }
    );
  }
}
