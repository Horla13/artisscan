-- ========================================
-- GESTION DE PROJETS/CHANTIERS
-- ========================================

-- 1️⃣ Créer la table projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  client TEXT NOT NULL,
  budget_alloue NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- 2️⃣ Ajouter une colonne project_id à la table scans
ALTER TABLE public.scans 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_scans_project_id ON public.scans(project_id);

-- 3️⃣ Row Level Security (RLS) pour projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy : Les utilisateurs peuvent voir uniquement leurs propres projets
CREATE POLICY "Users can view their own projects"
  ON public.projects
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy : Les utilisateurs peuvent créer leurs propres projets
CREATE POLICY "Users can create their own projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy : Les utilisateurs peuvent modifier leurs propres projets
CREATE POLICY "Users can update their own projects"
  ON public.projects
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy : Les utilisateurs peuvent supprimer leurs propres projets
CREATE POLICY "Users can delete their own projects"
  ON public.projects
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4️⃣ Fonction pour calculer le budget consommé d'un projet
CREATE OR REPLACE FUNCTION get_project_spent(project_uuid UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(montant_ttc), 0)
    FROM public.scans
    WHERE project_id = project_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5️⃣ Fonction pour calculer le budget restant d'un projet
CREATE OR REPLACE FUNCTION get_project_remaining(project_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  project_budget NUMERIC;
  project_spent NUMERIC;
BEGIN
  SELECT budget_alloue INTO project_budget
  FROM public.projects
  WHERE id = project_uuid;
  
  project_spent := get_project_spent(project_uuid);
  
  RETURN project_budget - project_spent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6️⃣ Vue pour obtenir les statistiques par projet
CREATE OR REPLACE VIEW project_stats AS
SELECT 
  p.id,
  p.user_id,
  p.nom,
  p.client,
  p.budget_alloue,
  COALESCE(SUM(s.montant_ttc), 0) AS budget_consomme,
  p.budget_alloue - COALESCE(SUM(s.montant_ttc), 0) AS budget_restant,
  COUNT(s.id) AS nombre_factures,
  p.created_at,
  p.updated_at
FROM public.projects p
LEFT JOIN public.scans s ON s.project_id = p.id
GROUP BY p.id, p.user_id, p.nom, p.client, p.budget_alloue, p.created_at, p.updated_at;

-- Policy pour la vue
ALTER VIEW project_stats SET (security_invoker = true);

-- ========================================
-- DONNÉES DE TEST (Optionnel)
-- ========================================

-- Décommentez ces lignes pour créer des projets de test
-- Remplacez 'YOUR_USER_ID' par votre vrai user_id

/*
INSERT INTO public.projects (user_id, nom, client, budget_alloue) VALUES
  ('YOUR_USER_ID', 'Rénovation Appartement Paris 15', 'M. Dupont', 50000.00),
  ('YOUR_USER_ID', 'Construction Maison Lyon', 'Mme Martin', 150000.00),
  ('YOUR_USER_ID', 'Plomberie Immeuble Marseille', 'Syndic ABC', 25000.00);
*/

-- ========================================
-- NOTES D'INSTALLATION
-- ========================================

/*
Pour exécuter ce script dans Supabase :

1. Allez dans le Dashboard Supabase
2. SQL Editor (dans le menu de gauche)
3. New Query
4. Copiez-collez ce script
5. Run

✅ Cela créera :
- Table projects
- Colonne project_id dans scans
- Policies RLS
- Fonctions de calcul
- Vue pour les statistiques

🔐 Sécurité :
- RLS activé
- Chaque user voit uniquement ses projets
- Fonctions SECURITY DEFINER pour calculs

📊 Fonctionnalités :
- Budget alloué par projet
- Budget consommé calculé automatiquement
- Budget restant calculé automatiquement
- Nombre de factures par projet
*/
