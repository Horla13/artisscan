-- =====================================================
-- ARTISSCAN - Schéma Base de Données Supabase
-- Gestion des Plans d'Abonnement (Free, Pro, Business)
-- =====================================================

-- 1. Créer ou Mettre à jour la table profiles
-- Cette table stocke les informations d'abonnement des utilisateurs

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'business')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Si la table existe déjà, ajouter la colonne subscription_tier
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free';

-- Ajouter une contrainte pour valider les valeurs
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_tier_check 
  CHECK (subscription_tier IN ('free', 'pro', 'business'));

-- 2. Mettre à jour la table scans pour ajouter le champ chantier (pour Business)
ALTER TABLE scans ADD COLUMN IF NOT EXISTS nom_chantier TEXT;

-- 3. Créer une vue pour compter les factures par utilisateur
CREATE OR REPLACE VIEW user_invoice_counts AS
SELECT 
  user_id,
  COUNT(*) as total_invoices,
  COUNT(CASE WHEN date_facture >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as invoices_this_month
FROM scans
GROUP BY user_id;

-- 4. Fonction pour vérifier si l'utilisateur peut scanner (limite Free)
CREATE OR REPLACE FUNCTION can_user_scan(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  invoice_count INTEGER;
BEGIN
  -- Récupérer le tier de l'utilisateur
  SELECT subscription_tier INTO user_tier
  FROM profiles
  WHERE id = user_uuid;
  
  -- Si pas de profil, considérer comme 'free'
  IF user_tier IS NULL THEN
    user_tier := 'free';
  END IF;
  
  -- Si Pro ou Business, toujours autorisé
  IF user_tier IN ('pro', 'business') THEN
    RETURN TRUE;
  END IF;
  
  -- Si Free, vérifier la limite de 5 scans
  SELECT COUNT(*) INTO invoice_count
  FROM scans
  WHERE user_id = user_uuid;
  
  RETURN invoice_count < 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fonction pour obtenir le nombre de scans restants (Free uniquement)
CREATE OR REPLACE FUNCTION get_remaining_scans(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  user_tier TEXT;
  invoice_count INTEGER;
BEGIN
  -- Récupérer le tier de l'utilisateur
  SELECT subscription_tier INTO user_tier
  FROM profiles
  WHERE id = user_uuid;
  
  -- Si Pro ou Business, retourner -1 (illimité)
  IF user_tier IN ('pro', 'business') THEN
    RETURN -1;
  END IF;
  
  -- Si Free, calculer les scans restants
  SELECT COUNT(*) INTO invoice_count
  FROM scans
  WHERE user_id = user_uuid;
  
  RETURN GREATEST(0, 5 - invoice_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Créer un trigger pour auto-créer un profil lors de l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, subscription_tier)
  VALUES (NEW.id, 'free')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Créer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 7. Politiques de Sécurité Row Level Security (RLS)

-- Activer RLS sur profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs peuvent lire leur propre profil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Politique : Les utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Politique : Les utilisateurs peuvent insérer leur propre profil
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 8. Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_scans_user_id_date ON scans(user_id, date_facture);
CREATE INDEX IF NOT EXISTS idx_scans_nom_chantier ON scans(nom_chantier) WHERE nom_chantier IS NOT NULL;

-- 9. Fonction pour mettre à jour le timestamp updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FIN DU SCHÉMA
-- =====================================================

-- Pour tester, vous pouvez exécuter :
-- SELECT can_user_scan(auth.uid());
-- SELECT get_remaining_scans(auth.uid());
-- SELECT * FROM user_invoice_counts WHERE user_id = auth.uid();

