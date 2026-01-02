import { supabase } from './supabase';

export type SubscriptionTier = 'free' | 'pro';

export interface UserProfile {
  id: string;
  subscription_tier: SubscriptionTier;
  subscription_status?: string;
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Récupère le profil utilisateur avec son tier d'abonnement
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Sélectionner uniquement les colonnes nécessaires
    const { data, error } = await supabase
      .from('profiles')
      .select('id, subscription_tier, subscription_status, stripe_customer_id, created_at, updated_at')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Erreur récupération profil:', error);
      // Retourner un profil par défaut en cas d'erreur
      return {
        id: user.id,
        subscription_tier: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    return data;
  } catch (err) {
    console.error('Erreur getUserProfile:', err);
    return null;
  }
}

/**
 * Vérifie si l'utilisateur peut scanner
 */
export async function canUserScan(): Promise<{ canScan: boolean; remaining: number; tier: SubscriptionTier }> {
  try {
    const profile = await getUserProfile();
    const tier = profile?.subscription_tier || 'free';

    // Pro peut scanner sans limite
    if (tier === 'pro' || profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing') {
      return { canScan: true, remaining: -1, tier: 'pro' };
    }

    return { canScan: false, remaining: 0, tier: 'free' };
  } catch (err) {
    console.error('Erreur canUserScan:', err);
    return { canScan: false, remaining: 0, tier: 'free' };
  }
}

/**
 * Met à jour le tier d'abonnement (pour tests ou upgrade)
 */
export async function updateSubscriptionTier(newTier: SubscriptionTier): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        subscription_tier: newTier,
        subscription_status: newTier === 'pro' ? 'active' : 'none',
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Erreur mise à jour tier:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Erreur updateSubscriptionTier:', err);
    return false;
  }
}

/**
 * Vérifie si l'utilisateur a accès à l'export CSV
 */
export function canExportCSV(tier: SubscriptionTier): boolean {
  return tier === 'pro';
}

/**
 * Retourne le nom affiché du plan
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  return tier === 'pro' ? 'PRO (Essai gratuit)' : 'Inactif';
}

/**
 * Retourne la couleur du badge selon le tier
 */
export function getTierBadgeColor(tier: SubscriptionTier): string {
  return tier === 'pro' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-slate-100 text-slate-400';
}

