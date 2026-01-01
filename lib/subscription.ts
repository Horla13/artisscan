import { supabase } from './supabase';

export type SubscriptionTier = 'free' | 'pro' | 'business';

export interface UserProfile {
  id: string;
  subscription_tier: SubscriptionTier;
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
      .select('id, subscription_tier, created_at, updated_at')
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

    // Pro et Business peuvent scanner sans limite
    if (tier === 'pro' || tier === 'business') {
      return { canScan: true, remaining: -1, tier };
    }

    // Free: limité à 5 scans
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { canScan: true, remaining: 5, tier }; // Par défaut, autoriser

    const { count, error } = await supabase
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      console.error('Erreur comptage scans:', error);
      // En cas d'erreur, autoriser par défaut
      return { canScan: true, remaining: 5, tier };
    }

    const invoiceCount = count || 0;
    const remaining = Math.max(0, 5 - invoiceCount);
    const canScan = invoiceCount < 5;

    return { canScan, remaining, tier };
  } catch (err) {
    console.error('Erreur canUserScan:', err);
    // En cas d'erreur, autoriser par défaut (ne jamais bloquer)
    return { canScan: true, remaining: 5, tier: 'free' };
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
  return tier === 'pro' || tier === 'business';
}

/**
 * Vérifie si l'utilisateur a accès aux champs chantier
 */
export function hasChantierAccess(tier: SubscriptionTier): boolean {
  return tier === 'business';
}

/**
 * Retourne le nom affiché du plan
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  const names: Record<SubscriptionTier, string> = {
    free: 'Gratuit',
    pro: 'Pro',
    business: 'Business'
  };
  return names[tier];
}

/**
 * Retourne la couleur du badge selon le tier
 */
export function getTierBadgeColor(tier: SubscriptionTier): string {
  const colors: Record<SubscriptionTier, string> = {
    free: 'bg-slate-100 text-slate-600',
    pro: 'bg-orange-500 text-white',
    business: 'bg-slate-900 text-white'
  };
  return colors[tier];
}

