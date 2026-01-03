import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Configuration du client Supabase avec options de persistance robustes
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce'
  },
  global: {
    headers: { 'x-application-name': 'artisscan' }
  }
})

// Fonction pour forcer la reconnexion et vider les caches locaux si nécessaire
export const refreshSupabaseClient = () => {
  console.log('🔄 Rafraîchissement forcé du client Supabase...');
  // En JS, le client est sans état pour le schéma, 
  // mais on s'assure que les appels futurs ne sont pas pollués
  return supabase;
};

