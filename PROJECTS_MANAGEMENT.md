# 🏗️ GESTION DE PROJETS / CHANTIERS - GUIDE COMPLET

## ✅ FONCTIONNALITÉ IMPLÉMENTÉE

**La gestion complète de projets est maintenant intégrée à ArtisScan !**

---

## 📊 ARCHITECTURE

### 1️⃣ Base de Données Supabase

**Table `projects` :**
```sql
CREATE TABLE public.projects (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  nom TEXT NOT NULL,
  client TEXT NOT NULL,
  budget_alloue NUMERIC(10, 2) NOT NULL,
  statut TEXT DEFAULT 'en_cours',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Colonne `project_id` ajoutée à `scans` :**
```sql
ALTER TABLE public.scans 
ADD COLUMN project_id UUID REFERENCES public.projects(id);
```

**Sécurité (RLS) :**
- ✅ Row Level Security activé
- ✅ Chaque utilisateur voit uniquement ses propres projets
- ✅ Policies pour SELECT, INSERT, UPDATE, DELETE

---

### 2️⃣ Fonctions SQL

**`get_project_spent(project_uuid)` :**
```sql
-- Calcule le total des factures d'un projet
RETURN SUM(montant_ttc) FROM scans WHERE project_id = project_uuid;
```

**`get_project_remaining(project_uuid)` :**
```sql
-- Calcule le budget restant
RETURN budget_alloue - get_project_spent(project_uuid);
```

**Vue `project_stats` :**
```sql
-- Vue pour obtenir les statistiques de tous les projets
SELECT 
  p.nom,
  p.client,
  p.budget_alloue,
  SUM(s.montant_ttc) AS budget_consomme,
  budget_alloue - SUM(s.montant_ttc) AS budget_restant,
  COUNT(s.id) AS nombre_factures
FROM projects p
LEFT JOIN scans s ON s.project_id = p.id
GROUP BY p.id;
```

---

## 🎨 INTERFACE UTILISATEUR

### 1️⃣ Onglet "Projets" dans le Dashboard

**Accès :**
- Navigation en bas → Icône 🏗️ "Projets"

**Contenu :**
- Liste des projets actifs sous forme de cartes
- Statistiques par projet :
  - Budget alloué
  - Budget consommé (orange)
  - Budget restant (vert ou rouge)
  - Barre de progression (%)
  - Nombre de factures associées
- Bouton "+ Nouveau Projet" (orange) en haut à droite

---

### 2️⃣ Modale de Création de Projet

**Champs :**
- **Nom du projet** (obligatoire) : Ex: "Rénovation Appartement Paris 15"
- **Client** (obligatoire) : Ex: "M. Dupont"
- **Budget alloué** (obligatoire) : Ex: 50000.00 €

**Boutons :**
- "Annuler" : Ferme la modale
- "Créer le projet" : Enregistre le projet (désactivé si champs vides)

**Validation :**
```typescript
const budget = parseFloat(newProject.budget_alloue);
if (isNaN(budget) || budget <= 0) {
  showToastMessage('Budget invalide', 'error');
  return;
}
```

---

### 3️⃣ Sélection du Projet lors du Scan

**Dans la modale de validation de facture :**

```typescript
// Dropdown ajouté AVANT la description
<div>
  <label>🏗️ Affecter à un projet (optionnel)</label>
  <select
    value={selectedProjectId}
    onChange={(e) => setSelectedProjectId(e.target.value)}
  >
    <option value="">Aucun projet</option>
    {projects.filter(p => p.statut === 'en_cours').map((project) => (
      <option key={project.id} value={project.id}>
        {project.nom} ({project.client})
      </option>
    ))}
  </select>
</div>
```

**Fonctionnement :**
1. L'utilisateur scanne une facture
2. L'IA extrait les données
3. La modale de validation s'ouvre
4. L'utilisateur peut sélectionner un projet dans le dropdown
5. En cliquant sur "Valider et Enregistrer", la facture est liée au projet

---

### 4️⃣ Affichage du Projet dans le Dashboard

**Cartes de Projet :**

```
┌──────────────────────────────────────────────┐
│ Rénovation Appartement Paris 15    🟢 En cours│
│ Client : M. Dupont                           │
│                                              │
│ Budget alloué       50 000,00 €              │
│ Budget consommé     32 500,00 € (orange)     │
│ Budget restant      17 500,00 € (vert)       │
│                                              │
│ Consommation                           65,0% │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░                       │
│                                              │
│ Factures associées                        5  │
└──────────────────────────────────────────────┘
```

**Barre de Progression (Couleur dynamique) :**
- 🟢 **0-80%** : Vert (`bg-green-500`)
- 🟠 **81-100%** : Amber (`bg-amber-500`)
- 🔴 **>100%** : Rouge (`bg-red-500`)

**Alerte Budget Dépassé :**
```
⚠️ Budget dépassé de 5 000,00 €
```
(Affiché si budget_restant < 0)

---

## 🔄 FLUX COMPLET

### Créer un Projet

```
1. Dashboard → Cliquer sur "Projets" (bottom nav)
2. Cliquer sur "+ Nouveau Projet"
3. Remplir le formulaire :
   - Nom : "Rénovation Appartement Paris 15"
   - Client : "M. Dupont"
   - Budget : 50000.00
4. Cliquer sur "Créer le projet"
5. Toast : "Projet créé avec succès !"
6. Le projet apparaît dans la liste
```

---

### Affecter une Facture à un Projet

```
1. Scanner → Prendre une photo de facture
2. IA analyse la facture
3. Modale de validation s'ouvre
4. Dans le dropdown "🏗️ Affecter à un projet", sélectionner le projet
5. Vérifier/modifier les montants HT et TTC
6. Cliquer sur "Valider et Enregistrer"
7. La facture est enregistrée ET liée au projet
8. Le budget consommé du projet est mis à jour automatiquement
```

---

### Voir les Statistiques d'un Projet

```
1. Dashboard → Cliquer sur "Projets"
2. Voir toutes les cartes de projets
3. Pour chaque projet :
   - Budget alloué (fixe)
   - Budget consommé (somme des factures liées)
   - Budget restant (calculé automatiquement)
   - Barre de progression (%)
   - Nombre de factures
```

---

## 📊 CALCULS AUTOMATIQUES

### Budget Consommé

```typescript
const budget_consomme = (scansData || []).reduce(
  (sum, scan) => sum + (scan.montant_ttc || 0), 
  0
);
```

**Requête Supabase :**
```typescript
const { data: scansData } = await supabase
  .from('scans')
  .select('montant_ttc')
  .eq('project_id', project.id);
```

---

### Budget Restant

```typescript
const budget_restant = project.budget_alloue - budget_consomme;
```

---

### Pourcentage Consommé

```typescript
const pourcentage_consomme = project.budget_alloue > 0 
  ? (budget_consomme / project.budget_alloue * 100) 
  : 0;
```

---

### Couleur Dynamique

```typescript
const getProgressColor = (percentage) => {
  if (percentage > 100) return 'bg-red-500';   // 🔴 Dépassé
  if (percentage > 80) return 'bg-amber-500';  // 🟠 Attention
  return 'bg-green-500';                        // 🟢 OK
};
```

---

## 🎨 DESIGN

### Cartes de Projet

**Couleurs :**
- Budget alloué : `text-slate-900` (noir)
- Budget consommé : `text-orange-600` (orange ArtisScan)
- Budget restant positif : `text-green-600` (vert)
- Budget restant négatif : `text-red-600` (rouge)

**Barre de Progression :**
- Fond : `bg-slate-200` (gris clair)
- Progression : `bg-green-500 / bg-amber-500 / bg-red-500`
- Hauteur : `h-3`
- Coins arrondis : `rounded-full`
- Transition : `transition-all duration-500`

**Alerte Budget Dépassé :**
- Fond : `bg-red-50`
- Bordure : `border-red-200`
- Texte : `text-red-700`
- Icône : ⚠️

---

### Modale de Création

**Inputs :**
- Bordure : `border-slate-200`
- Focus : `ring-orange-500`
- Placeholder : `text-slate-400`

**Boutons :**
- Annuler : `bg-slate-100` → `hover:bg-slate-200`
- Créer : `bg-orange-500` → `hover:bg-orange-600`
- Disabled : `opacity-50` + `cursor-not-allowed`

---

## 🔐 SÉCURITÉ

### Row Level Security (RLS)

**Policies Appliquées :**

```sql
-- Les utilisateurs voient uniquement leurs projets
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

-- Les utilisateurs créent uniquement leurs projets
CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs modifient uniquement leurs projets
CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

-- Les utilisateurs suppriment uniquement leurs projets
CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);
```

---

### Validation Côté Client

```typescript
// Vérifier que tous les champs sont remplis
disabled={!newProject.nom || !newProject.client || !newProject.budget_alloue}

// Vérifier que le budget est valide
if (isNaN(budget) || budget <= 0) {
  showToastMessage('Budget invalide', 'error');
  return;
}
```

---

## 📝 TYPES TYPESCRIPT

```typescript
interface Project {
  id: string;
  user_id: string;
  nom: string;
  client: string;
  budget_alloue: number;
  statut: 'en_cours' | 'termine' | 'annule';
  date_debut: string;
  date_fin?: string;
  created_at: string;
  updated_at: string;
}

interface ProjectStats {
  id: string;
  nom: string;
  client: string;
  budget_alloue: number;
  budget_consomme: number;
  budget_restant: number;
  nombre_factures: number;
  pourcentage_consomme: number;
  statut: string;
}
```

---

## 🧪 TESTS À FAIRE

### Test 1 : Créer un Projet

```
1. Aller sur "Projets"
2. Cliquer sur "+ Nouveau Projet"
3. Remplir :
   - Nom : "Test Projet 1"
   - Client : "M. Test"
   - Budget : 10000
4. Cliquer sur "Créer le projet"
5. ✅ Vérifier : Toast "Projet créé avec succès !"
6. ✅ Vérifier : Le projet apparaît dans la liste
7. ✅ Vérifier : Budget consommé = 0.00 €
8. ✅ Vérifier : Budget restant = 10 000.00 €
9. ✅ Vérifier : Barre verte à 0%
```

---

### Test 2 : Affecter une Facture

```
1. Scanner une facture
2. Dans la modale, sélectionner "Test Projet 1"
3. Valider avec HT=1000, TTC=1200
4. ✅ Vérifier : Toast "Facture enregistrée !"
5. Aller sur "Projets"
6. ✅ Vérifier : Budget consommé = 1 200.00 €
7. ✅ Vérifier : Budget restant = 8 800.00 €
8. ✅ Vérifier : Barre à 12%
9. ✅ Vérifier : Factures associées = 1
```

---

### Test 3 : Budget Dépassé

```
1. Scanner 10 factures de 1200€ TTC chacune
2. Affecter toutes à "Test Projet 1"
3. Aller sur "Projets"
4. ✅ Vérifier : Budget consommé = 12 000.00 € (orange)
5. ✅ Vérifier : Budget restant = -2 000.00 € (rouge)
6. ✅ Vérifier : Barre rouge à 100%
7. ✅ Vérifier : Alerte "⚠️ Budget dépassé de 2 000.00 €"
```

---

### Test 4 : Plusieurs Projets

```
1. Créer 3 projets différents
2. Scanner 15 factures
3. Affecter 5 factures à chaque projet
4. Aller sur "Projets"
5. ✅ Vérifier : Les 3 projets s'affichent
6. ✅ Vérifier : Chaque projet a 5 factures
7. ✅ Vérifier : Les budgets sont indépendants
```

---

### Test 5 : Facture Sans Projet

```
1. Scanner une facture
2. Dans la modale, laisser "Aucun projet"
3. Valider
4. ✅ Vérifier : La facture est enregistrée
5. ✅ Vérifier : Elle apparaît dans l'historique
6. ✅ Vérifier : Elle n'affecte aucun projet
```

---

## 📚 FICHIERS MODIFIÉS

### `/app/dashboard/page.tsx`

**1. Types (lignes 23-46) :**
- ✅ Interface `Project`
- ✅ Interface `ProjectStats`

**2. États (lignes 76-84) :**
```typescript
const [projects, setProjects] = useState<Project[]>([]);
const [projectsStats, setProjectsStats] = useState<ProjectStats[]>([]);
const [selectedProjectId, setSelectedProjectId] = useState<string>('');
const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
const [newProject, setNewProject] = useState({ nom: '', client: '', budget_alloue: '' });
```

**3. Fonctions (lignes 302-403) :**
- ✅ `loadProjects()` : Charge la liste des projets
- ✅ `loadProjectsStats()` : Calcule les stats de chaque projet
- ✅ `createProject()` : Crée un nouveau projet

**4. Vue Projets (lignes 1130-1257) :**
- ✅ Liste des projets avec cartes
- ✅ Statistiques détaillées
- ✅ Barre de progression
- ✅ Alerte si budget dépassé

**5. Modale Validation Scan (lignes 1556-1577) :**
- ✅ Dropdown de sélection de projet
- ✅ Message si aucun projet actif

**6. Modale Création Projet (lignes ~1647) :**
- ✅ Formulaire avec 3 champs
- ✅ Validation des données
- ✅ Boutons Annuler/Créer

**7. Bottom Navigation (lignes 1785-1795) :**
- ✅ Bouton "Projets" avec icône 🏗️

---

### `/supabase_projects_schema.sql` (NOUVEAU)

**Contenu :**
- Table `projects`
- Colonne `project_id` dans `scans`
- Policies RLS
- Fonctions `get_project_spent()` et `get_project_remaining()`
- Vue `project_stats`

---

## 🚀 INSTALLATION

### 1. Créer les Tables dans Supabase

```bash
1. Aller dans Supabase Dashboard
2. SQL Editor → New Query
3. Copier-coller le contenu de supabase_projects_schema.sql
4. Run
5. ✅ Tables et fonctions créées
```

---

### 2. Vérifier les Permissions

```sql
-- Vérifier que RLS est activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'projects';

-- Doit retourner : rowsecurity = true
```

---

### 3. Tester les Fonctions

```sql
-- Créer un projet de test
INSERT INTO public.projects (user_id, nom, client, budget_alloue)
VALUES ('YOUR_USER_ID', 'Test Projet', 'Client Test', 50000.00);

-- Vérifier la vue des stats
SELECT * FROM project_stats;
```

---

## 🎉 RÉSULTAT

```
┌────────────────────────────────────────┐
│ ✅ GESTION DE PROJETS COMPLÈTE         │
│                                        │
│ 🏗️ Créer des projets/chantiers         │
│ 💰 Définir un budget alloué            │
│ 🔗 Affecter des factures aux projets   │
│ 📊 Suivre budget consommé vs restant   │
│ 📈 Voir le % de consommation           │
│ ⚠️ Alerte si budget dépassé            │
│ 🔐 Sécurisé avec RLS Supabase          │
│ 🎨 Interface claire et intuitive       │
│                                        │
│ Parfait pour les artisans qui gèrent   │
│ plusieurs chantiers en parallèle ! 🚀  │
└────────────────────────────────────────┘
```

---

**Fonctionnalité implémentée le 01/01/2026 à 15:00** ✅

**Prêt pour la production !** 🎊

