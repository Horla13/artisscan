-- =====================================================
-- ARTISSCAN - Schéma Base de Données Supabase
-- =====================================================

-- 1. Créer ou Mettre à jour la table profiles
-- Cette table stocke les informations de base des utilisateurs

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  is_pro BOOLEAN DEFAULT FALSE,
  plan TEXT, -- 'monthly', 'yearly', ou NULL
  subscription_status TEXT, -- ex: 'trialing', 'active', 'canceled', 'unpaid'
  end_date TIMESTAMP WITH TIME ZONE, -- fin de période (current_period_end Stripe)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter les colonnes si elles n'existent pas (idempotent)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;

-- Contrainte pour valider les valeurs de plan (optionnelle)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('monthly', 'yearly') OR plan IS NULL);

-- 2. Mettre à jour la table scans pour ajouter le champ chantier
ALTER TABLE scans ADD COLUMN IF NOT EXISTS nom_chantier TEXT;

-- 3. Créer une vue pour compter les factures par utilisateur
CREATE OR REPLACE VIEW user_invoice_counts AS
SELECT 
  user_id,
  COUNT(*) as total_invoices,
  COUNT(CASE WHEN date_facture >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as invoices_this_month
FROM scans
GROUP BY user_id;

-- 4. Fonction pour vérifier si l'utilisateur peut scanner (Ouvert à tous)
CREATE OR REPLACE FUNCTION can_user_scan(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fonction pour obtenir le nombre de scans restants (Illimité)
CREATE OR REPLACE FUNCTION get_remaining_scans(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN -1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Créer un trigger pour auto-créer un profil lors de l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, is_pro, plan)
  VALUES (NEW.id, NEW.email, FALSE, NULL)
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
