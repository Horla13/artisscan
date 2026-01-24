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
  subscription_end_date TIMESTAMP WITH TIME ZONE, -- ✅ fin de période (source de vérité affichage)
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
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;

-- Contrainte pour valider les valeurs de plan (optionnelle)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('monthly', 'yearly') OR plan IS NULL);

-- 2. Mettre à jour la table scans pour ajouter le champ chantier
ALTER TABLE scans ADD COLUMN IF NOT EXISTS nom_chantier TEXT;

-- ✅ 2bis. Standardisation des champs monétaires (OBLIGATOIRE)
-- Convention V1:
-- - total_amount = TTC (NUMERIC)
-- - amount_ht    = HT (NUMERIC)
-- - amount_tva   = TVA (NUMERIC)
ALTER TABLE scans ADD COLUMN IF NOT EXISTS amount_ht NUMERIC;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS amount_tva NUMERIC;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS total_amount NUMERIC;

-- Backfill SAFE depuis les anciennes colonnes si elles existent (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scans' AND column_name = 'montant_ht'
  ) THEN
    EXECUTE 'UPDATE scans SET amount_ht = COALESCE(amount_ht, montant_ht) WHERE amount_ht IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scans' AND column_name = 'tva'
  ) THEN
    EXECUTE 'UPDATE scans SET amount_tva = COALESCE(amount_tva, tva) WHERE amount_tva IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'scans' AND column_name = 'montant_ttc'
  ) THEN
    EXECUTE 'UPDATE scans SET total_amount = COALESCE(total_amount, montant_ttc) WHERE total_amount IS NULL';
  END IF;

  -- Si total_amount encore NULL mais HT+TVA présents, recalculer TTC
  EXECUTE 'UPDATE scans SET total_amount = (amount_ht + amount_tva) WHERE total_amount IS NULL AND amount_ht IS NOT NULL AND amount_tva IS NOT NULL';
END $$;

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

-- ❗ V1 SÉCURITÉ: ne JAMAIS permettre au client de modifier des champs d’abonnement (is_pro, plan, stripe_*).
-- On supprime toute policy UPDATE trop large.
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Option minimale SAFE:
-- - On autorise uniquement la mise à jour de champs neutres (ex: comptable_email) via privilèges de colonnes.
-- - Le reste (is_pro, plan, subscription_status, stripe_*) est modifié uniquement via service_role (webhook).
--
-- RLS: limiter aux lignes de l’utilisateur
CREATE POLICY "Users can update own profile (safe fields only)"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Privilèges: empêcher UPDATE global, puis n’autoriser que certaines colonnes (si elles existent).
REVOKE UPDATE ON TABLE profiles FROM anon, authenticated;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'comptable_email'
  ) THEN
    GRANT UPDATE (comptable_email) ON TABLE profiles TO authenticated;
  END IF;
END $$;

-- Politique : Les utilisateurs peuvent insérer leur propre profil
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 8. Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_scans_user_id_date ON scans(user_id, date_facture);
CREATE INDEX IF NOT EXISTS idx_scans_nom_chantier ON scans(nom_chantier) WHERE nom_chantier IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scans_total_amount ON scans(total_amount);

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
