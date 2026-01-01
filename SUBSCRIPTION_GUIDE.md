# 🚀 Guide d'Installation - Système d'Abonnement ArtisScan

## ✅ Fonctionnalités Implémentées

### 1. 📊 **Base de Données Supabase**
- ✅ Table `profiles` avec `subscription_tier`
- ✅ Champ `nom_chantier` dans `scans` (Business)
- ✅ Fonctions SQL pour vérifier les limites
- ✅ Triggers automatiques
- ✅ Row Level Security (RLS)

### 2. 🔒 **Logique Plan Gratuit (FREE)**
- ✅ Limite de 5 scans par utilisateur
- ✅ Bouton Scanner désactivé après 5 scans
- ✅ Modale explicative avec CTA vers Pro
- ✅ Export CSV désactivé
- ✅ Compteur de scans restants dans le header

### 3. 👑 **Privilèges PRO & BUSINESS**
- ✅ Badge coloré dans le header
- ✅ Scans illimités
- ✅ Export CSV illimité
- ✅ Graphiques avancés
- ✅ Champ "Nom du Chantier" (Business uniquement)

### 4. 🧪 **Simulateur de Test**
- ✅ Boutons dans Paramètres pour changer de plan
- ✅ FREE / PRO / BUSINESS en un clic
- ✅ Toast de confirmation

### 5. 🔐 **Sécurité**
- ✅ Vérifications côté client (UX réactive)
- ✅ Vérifications côté serveur (sécurité)
- ✅ Row Level Security Supabase

---

## 📋 Installation Étape par Étape

### **ÉTAPE 1 : Exécuter le Schéma SQL sur Supabase**

1. **Connectez-vous à Supabase** : https://supabase.com/dashboard

2. **Ouvrez le SQL Editor** :
   - Allez dans votre projet
   - Cliquez sur "SQL Editor" dans le menu gauche

3. **Copiez-collez le contenu du fichier** `supabase_schema.sql`

4. **Exécutez le script** :
   - Cliquez sur "Run" (▶️)
   - Vérifiez qu'il n'y a pas d'erreurs

5. **Vérifications** :
   ```sql
   -- Vérifier que la table profiles existe
   SELECT * FROM profiles LIMIT 5;
   
   -- Vérifier que le champ nom_chantier existe
   SELECT nom_chantier FROM scans WHERE nom_chantier IS NOT NULL LIMIT 5;
   
   -- Tester les fonctions
   SELECT can_user_scan(auth.uid());
   SELECT get_remaining_scans(auth.uid());
   ```

---

### **ÉTAPE 2 : Variables d'Environnement** (Optionnel)

Pour la vérification côté serveur (recommandé pour la production), ajoutez :

```env
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key
```

**Où trouver cette clé ?**
- Supabase Dashboard → Settings → API
- Section "Project API keys"
- Copiez la clé "service_role" (⚠️ gardez-la secrète !)

**Note** : Si vous ne l'ajoutez pas, l'app utilisera la clé anon (moins sécurisé mais fonctionnel).

---

### **ÉTAPE 3 : Tester Localement**

1. **Lancez l'application** :
   ```bash
   npm run dev
   ```

2. **Connectez-vous / Inscrivez-vous**

3. **Vérifiez le header** :
   - Vous devriez voir "5/5 scans restants" (plan Free par défaut)

4. **Testez le Scanner** :
   - Scannez 5 factures
   - Au 6ème scan → Modale de limitation apparaît

5. **Testez l'Export CSV** :
   - En Free → Désactivé avec message d'erreur
   - Passez en Pro (simulateur) → Export fonctionne

6. **Testez le Simulateur** :
   - Allez dans Paramètres
   - Cliquez sur "PRO" → Badge orange apparaît
   - Cliquez sur "BUSINESS" → Badge noir + champ Chantier

---

## 🎯 Fonctionnement Détaillé

### **Plan FREE (Gratuit)**

**Limitations :**
- ✅ 5 scans maximum
- ❌ Pas d'export CSV
- ❌ Pas de champ Chantier
- ✅ Historique 30 jours

**UX :**
- Compteur dans header : "3/5 scans restants"
- Après 5 scans → Bouton désactivé
- Clic sur Scanner → Modale avec upgrade

---

### **Plan PRO (19€/mois)**

**Avantages :**
- ✅ Scans illimités
- ✅ Export CSV illimité
- ✅ Catégorisation IA automatique
- ✅ Historique illimité
- ✅ Graphiques & statistiques

**UX :**
- Badge orange "PRO" dans header
- Bouton Scanner toujours actif
- Export CSV débloqué

---

### **Plan BUSINESS (49€/mois)**

**Avantages :**
- ✅ Tout du plan Pro
- ✅ Champ "Nom du Chantier"
- ✅ Analyse de rentabilité par chantier
- ✅ Jusqu'à 5 utilisateurs
- ✅ Support prioritaire

**UX :**
- Badge noir "BUSINESS" dans header
- Champ Chantier visible dans Scanner
- Filtrage par chantier dans historique (à venir)

---

## 🔧 Architecture Technique

### **Côté Client** (`lib/subscription.ts`)

**Fonctions principales :**
```typescript
getUserProfile()         // Récupère le profil + tier
canUserScan()           // Vérifie si peut scanner
canExportCSV(tier)      // Vérifie accès export
hasChantierAccess(tier) // Vérifie accès chantier
updateSubscriptionTier() // Change le tier (test)
```

**États React** (Dashboard) :
```typescript
userTier: 'free' | 'pro' | 'business'
canScan: boolean
remainingScans: number
showLimitModal: boolean
```

---

### **Côté Serveur** (`app/api/analyze/route.ts`)

**Vérifications :**
1. Récupère le token d'auth
2. Identifie l'utilisateur
3. Récupère son tier
4. Si FREE → Compte les scans
5. Si >= 5 → Retourne erreur 403

**Sécurité :**
- ✅ Double vérification (client + serveur)
- ✅ Impossible de bypass en modifiant le client
- ✅ Token JWT vérifié

---

### **Base de Données Supabase**

**Table `profiles` :**
```sql
id: UUID (FK auth.users)
subscription_tier: TEXT (free/pro/business)
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

**Table `scans` (modifiée) :**
```sql
...
nom_chantier: TEXT (nullable)
```

**Fonctions SQL :**
- `can_user_scan(uuid)` → boolean
- `get_remaining_scans(uuid)` → integer

---

## 📊 Flux Utilisateur Complet

### **Scénario 1 : Utilisateur Free atteint la limite**

```
1. Utilisateur scanne 5 factures
2. Header affiche "0/5 scans restants"
3. Clic sur bouton Scanner
4. ❌ Modale s'affiche :
   "Limite de scans atteinte"
   "Passez au plan Pro pour :"
   - Scans illimités
   - Export CSV
   - etc.
5. Bouton "Passer à Pro" → Landing page#tarification
```

---

### **Scénario 2 : Upgrade vers Pro**

```
1. Utilisateur clique "Passer à Pro"
2. Redirigé vers /#tarification
3. Choisit plan Pro (19€)
4. Paiement (à implémenter)
5. subscription_tier = 'pro' en DB
6. ✅ Retour dashboard :
   - Badge PRO orange
   - Scans illimités
   - Export CSV activé
```

---

### **Scénario 3 : Utilisateur Business scanne**

```
1. Badge BUSINESS noir dans header
2. Section Scanner affiche :
   - Input "Nom du Chantier" (visible)
   - Placeholder: "Rénovation Appartement Paris 15"
3. Remplit le champ (optionnel)
4. Scanne la facture
5. ✅ Sauvegardé avec nom_chantier
6. Futur : Filtrage et analyse par chantier
```

---

## 🧪 Tests à Effectuer

### **Test 1 : Plan Free - Limitation**
```
✓ Créer un compte (Free par défaut)
✓ Scanner 5 factures
✓ Vérifier compteur : "0/5 scans restants"
✓ Essayer 6ème scan → Modale apparaît
✓ Essayer export CSV → Message d'erreur
```

### **Test 2 : Upgrade Pro (Simulateur)**
```
✓ Aller dans Paramètres
✓ Cliquer "PRO"
✓ Vérifier badge orange
✓ Essayer scanner → Fonctionne
✓ Essayer export CSV → Fonctionne
```

### **Test 3 : Plan Business - Chantier**
```
✓ Passer en BUSINESS (simulateur)
✓ Vérifier badge noir
✓ Aller dans Scanner
✓ Vérifier champ "Nom du Chantier" visible
✓ Remplir et scanner
✓ Vérifier dans DB que nom_chantier est sauvegardé
```

### **Test 4 : Sécurité Serveur**
```
✓ Plan FREE avec 5 scans
✓ Modifier le code client pour bypass
✓ Essayer de scanner → API refuse (403)
```

---

## 🚨 Suppression du Simulateur (Production)

**⚠️ IMPORTANT** : Avant le déploiement final, supprimez le simulateur !

Dans `app/dashboard/page.tsx`, supprimez cette section :
```typescript
{/* Simulateur de Test - Mode Développeur */}
<div className="card-clean rounded-2xl p-6 border-2 border-amber-200 bg-amber-50">
  ...
</div>
```

**Pourquoi ?**
- Les utilisateurs pourraient se donner Pro gratuitement
- C'est uniquement pour le développement/test

**Alternative Production :**
- Intégrez un vrai système de paiement (Stripe, PayPal)
- Webhooks pour mettre à jour subscription_tier
- Page de checkout dédiée

---

## 💳 Intégration Paiement (À venir)

### **Avec Stripe** :
1. Créer 3 produits (Free, Pro, Business)
2. Générer liens de checkout
3. Webhook Stripe → Met à jour subscription_tier
4. Gestion des abonnements récurrents

### **Flux :**
```
Landing → Clic "Passer à Pro" 
       → Page Checkout Stripe
       → Paiement
       → Webhook
       → UPDATE profiles SET subscription_tier='pro'
       → Redirect Dashboard
```

---

## 📝 Fichiers Créés/Modifiés

### **Nouveaux Fichiers :**
1. ✅ `supabase_schema.sql` - Schéma complet
2. ✅ `lib/subscription.ts` - Helpers abonnement
3. ✅ `SUBSCRIPTION_GUIDE.md` - Ce guide

### **Fichiers Modifiés :**
1. ✅ `app/dashboard/page.tsx` - Logique complète
2. ✅ `app/api/analyze/route.ts` - Vérification serveur

---

## 🎉 Résultat Final

**Votre application ArtisScan dispose maintenant de :**

✅ **Système d'abonnement complet** (Free/Pro/Business)
✅ **Limitations intelligentes** (5 scans Free)
✅ **UX professionnelle** (modales, badges, compteurs)
✅ **Sécurité robuste** (vérifications client + serveur)
✅ **Fonctionnalités différenciées** par plan
✅ **Simulateur de test** pour développement
✅ **Champ Chantier** pour Business
✅ **Export CSV** réservé aux abonnés

**Prêt pour la monétisation ! 💰**

