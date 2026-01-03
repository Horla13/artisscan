import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  console.log('🔔 RECU DANS WEBHOOK - DEBUT');
  
  // 1. Création du client Supabase avec SERVICE_ROLE_KEY dès le début
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Variables Supabase manquantes');
    return NextResponse.json({ received: true, error: 'Config missing' }, { status: 500 });
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  console.log('✅ Client Supabase Admin créé');
  
  try {
    // 2. Récupération du body (sans validation de signature pour test)
    const body = await req.json();
    console.log('📦 Body reçu:', JSON.stringify(body, null, 2));
    
    const event = body;
    console.log('📋 Type événement:', event.type);
    
    // 3. Traitement de l'événement checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      console.log('✅ Événement checkout.session.completed détecté');
      
      const session = event.data.object;
      const userEmail = session.customer_details?.email || session.customer_email;
      const customerId = session.customer;
      
      console.log('📧 Email client reçu:', userEmail);
      console.log('📧 Type:', typeof userEmail);
      console.log('📧 Longueur:', userEmail?.length);
      console.log('🆔 Customer ID:', customerId);
      
      if (!userEmail) {
        console.error('❌ Pas d\'email trouvé dans la session');
        return NextResponse.json({ received: true, error: 'No email' }, { status: 200 });
      }
      
      // 4. Récupération de l'utilisateur via son email dans auth.users
      console.log('🔍 Recherche utilisateur par email:', userEmail);
      const { data: { users }, error: searchError } = await supabase.auth.admin.listUsers();
      
      if (searchError) {
        console.error('❌ Erreur recherche utilisateur:', searchError);
        return NextResponse.json({ received: true, error: searchError.message }, { status: 200 });
      }
      
      const user = users.find(u => u.email === userEmail);
      
      if (!user) {
        console.error('❌ Utilisateur non trouvé pour email:', userEmail);
        console.log('👥 Utilisateurs trouvés:', users.map(u => u.email));
        return NextResponse.json({ received: true, error: 'User not found' }, { status: 200 });
      }
      
      console.log('✅ Utilisateur trouvé - ID:', user.id);
      
      // 5. Update ultra-simple : uniquement plan = 'pro'
      console.log('📝 Tentative UPDATE plan = pro pour email:', userEmail);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          plan: 'pro',
          updated_at: new Date().toISOString()
        })
        .eq('email', userEmail)
        .select();
      
      if (error) {
        console.error('❌ ERREUR UPDATE:', JSON.stringify(error));
        console.error('Code erreur:', error.code);
        console.error('Details:', error.details);
        console.error('Message:', error.message);
        return NextResponse.json({ received: true, error: error.message }, { status: 200 });
      }
      
      console.log('🎉 SUCCÈS: Plan PRO activé pour:', userEmail);
      console.log('✅ Lignes modifiées:', data?.length || 0);
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

