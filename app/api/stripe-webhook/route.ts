import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  console.log('🔔 RECU DANS WEBHOOK - DEBUT');
  
  try {
    // 1. Récupération du body (sans validation de signature pour test)
    const body = await req.json();
    console.log('📦 Body reçu:', JSON.stringify(body, null, 2));
    
    const event = body;
    console.log('📋 Type événement:', event.type);
    
    // 2. Traitement de l'événement checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      console.log('✅ Événement checkout.session.completed détecté');
      
      const session = event.data.object;
      const userEmail = session.customer_details?.email || session.customer_email;
      const customerId = session.customer;
      
      console.log('📧 Email client:', userEmail);
      console.log('🆔 Customer ID:', customerId);
      
      if (!userEmail) {
        console.error('❌ Pas d\'email trouvé dans la session');
        return NextResponse.json({ received: true, error: 'No email' }, { status: 200 });
      }
      
      // 3. Création du client Supabase avec SERVICE_ROLE_KEY
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !serviceRoleKey) {
        console.error('❌ Variables Supabase manquantes');
        return NextResponse.json({ received: true, error: 'Config missing' }, { status: 200 });
      }
      
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      console.log('✅ Client Supabase Admin créé');
      
      // 4. Update/Upsert du profil en PRO
      const updateData = {
        email: userEmail,
        stripe_customer_id: customerId,
        subscription_tier: 'pro',
        plan: 'pro',
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      };
      
      console.log('📝 Tentative UPSERT avec:', updateData);
      
      const { data, error } = await supabase
        .from('profiles')
        .upsert(updateData, { onConflict: 'email' });
      
      if (error) {
        console.error('❌ ERREUR UPSERT:', JSON.stringify(error));
        return NextResponse.json({ received: true, error: error.message }, { status: 200 });
      }
      
      console.log('🎉 SUCCÈS: Plan PRO activé pour:', userEmail);
      console.log('✅ Données retournées:', data);
    }
    
    // 5. Réponse 200 obligatoire pour Stripe
    console.log('✅ Webhook traité avec succès');
    return NextResponse.json({ received: true }, { status: 200 });
    
  } catch (err: any) {
    console.error('❌ ERREUR GLOBALE:', err.message);
    console.error('Stack:', err.stack);
    return NextResponse.json({ received: true, error: err.message }, { status: 200 });
  }
}

