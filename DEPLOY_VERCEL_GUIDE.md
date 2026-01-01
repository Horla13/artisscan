# 🚀 Guide de Déploiement Vercel - ArtisScan Expert

## ✅ Étape 1 : Code Poussé sur GitHub

**Status :** ✅ TERMINÉ

```bash
✓ git add .
✓ git commit -m "feat: Version Expert complète"
✓ git push origin main
```

**Repository :** `https://github.com/Horla13/artisscan.git`

---

## 🌐 Étape 2 : Déployer sur Vercel

### A. Aller sur Vercel

1. **Ouvrez votre navigateur** et allez sur :
   ```
   https://vercel.com
   ```

2. **Connectez-vous** avec votre compte GitHub

---

### B. Importer le Projet

1. Cliquez sur **"Add New..."** → **"Project"**

2. Sélectionnez votre repository :
   ```
   Horla13/artisscan
   ```

3. Cliquez sur **"Import"**

---

### C. Configurer le Projet

#### 1. **Framework Preset**
```
Next.js (détecté automatiquement)
```
✅ Ne rien changer

#### 2. **Root Directory**
```
./
```
✅ Laisser par défaut

#### 3. **Build & Output Settings**

```
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```
✅ Tout est automatique avec Next.js

---

### D. Variables d'Environnement ⚠️ IMPORTANT

**Cliquez sur "Environment Variables"** et ajoutez :

#### Variable 1 : OpenAI API Key
```
Nom: OPENAI_API_KEY
Valeur: sk-proj-votre-clé-openai...
Environment: Production, Preview, Development
```

#### Variable 2 : Supabase URL
```
Nom: NEXT_PUBLIC_SUPABASE_URL
Valeur: https://votre-projet.supabase.co
Environment: Production, Preview, Development
```

#### Variable 3 : Supabase Anon Key
```
Nom: NEXT_PUBLIC_SUPABASE_ANON_KEY
Valeur: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Environment: Production, Preview, Development
```

**📝 Où trouver ces valeurs ?**

**OpenAI :**
- Allez sur `https://platform.openai.com/api-keys`
- Créez une nouvelle clé API
- Copiez-la immédiatement (elle ne s'affichera qu'une fois)

**Supabase :**
- Allez sur votre projet Supabase
- Settings → API
- Copiez `Project URL` et `anon public key`

---

### E. Déployer

1. Vérifiez que tout est correct

2. Cliquez sur **"Deploy"**

3. Attendez 2-3 minutes ⏳

4. **SUCCÈS !** 🎉

---

## 🌍 Étape 3 : Accéder à Votre Application

Vercel vous donnera une URL comme :

```
https://artisscan.vercel.app
```

Ou un domaine personnalisé si vous en avez configuré un.

---

## 📱 Étape 4 : Tester sur iPhone

### A. Ouvrir l'App

1. Sur votre iPhone, ouvrez **Safari**

2. Allez sur :
   ```
   https://artisscan.vercel.app
   ```

### B. Ajouter à l'Écran d'Accueil

1. Appuyez sur le bouton **Partager** (carré avec flèche)

2. Faites défiler et appuyez sur **"Sur l'écran d'accueil"**

3. Donnez un nom : **"ArtisScan"**

4. Appuyez sur **"Ajouter"**

### C. Résultat

✅ L'icône ArtisScan apparaît sur votre écran d'accueil
✅ Barre de statut gris ardoise
✅ Mode plein écran (sans barre Safari)
✅ Expérience application native

---

## 🔧 Étape 5 : Vérifications Post-Déploiement

### A. Tests Fonctionnels

**Landing Page :**
- ✅ Chargement rapide
- ✅ Design cohérent
- ✅ Boutons "Commencer" fonctionnent

**Login :**
- ✅ Formulaire de connexion
- ✅ Création de compte
- ✅ Redirection vers dashboard

**Dashboard :**
- ✅ Stats s'affichent
- ✅ Graphique 7 jours visible
- ✅ Navigation bottom fonctionne

**Scanner :**
- ✅ Sélection photo fonctionne
- ✅ Spinner avec messages changeants
- ✅ Toast de confirmation
- ✅ Facture sauvegardée

**Historique :**
- ✅ Liste des factures
- ✅ Tri par date/montant/catégorie
- ✅ Export CSV fonctionne
- ✅ Suppression avec confirmation

**Paramètres :**
- ✅ Page s'affiche
- ✅ Export CSV global

---

### B. Tests Performance

Ouvrez Chrome DevTools :

```
F12 → Lighthouse → Run Audit
```

**Objectifs :**
- 🎯 Performance : > 90
- 🎯 Accessibility : > 95
- 🎯 Best Practices : > 95
- 🎯 SEO : > 90

---

### C. Tests Mobile

**Sur iPhone :**
1. ✅ Scanner une facture
2. ✅ Vérifier les stats
3. ✅ Trier l'historique
4. ✅ Exporter en CSV
5. ✅ Supprimer une facture

---

## 🔄 Étape 6 : Mises à Jour Futures

### Workflow Automatique

À chaque fois que vous faites :

```bash
git add .
git commit -m "votre message"
git push origin main
```

**Vercel redéploie automatiquement !** 🚀

**Temps de déploiement :** 2-3 minutes

**Notification :** Email + Dashboard Vercel

---

## 🐛 Dépannage

### Problème 1 : Erreur de Build

**Symptôme :** Build échoue sur Vercel

**Solutions :**
```bash
# Test local
npm run build

# Si erreur, corriger puis :
git add .
git commit -m "fix: Correction erreur build"
git push origin main
```

---

### Problème 2 : Variables d'Environnement

**Symptôme :** "Service temporairement indisponible"

**Solution :**
1. Allez sur Vercel Dashboard
2. Projet → Settings → Environment Variables
3. Vérifiez que les 3 variables sont définies
4. Redéployez : Deployments → ⋯ → Redeploy

---

### Problème 3 : Base de Données

**Symptôme :** Factures ne se sauvegardent pas

**Solutions :**
1. Vérifiez Supabase :
   - Table `scans` existe
   - RLS (Row Level Security) correctement configuré
   
2. Vérifiez les variables :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### Problème 4 : OpenAI API

**Symptôme :** "IA n'a pas pu analyser"

**Solutions :**
1. Vérifiez votre crédit OpenAI :
   - `https://platform.openai.com/usage`
   
2. Vérifiez la clé API :
   - Variable `OPENAI_API_KEY` correcte
   
3. Testez une nouvelle clé :
   - Créez une nouvelle clé sur OpenAI
   - Mettez à jour sur Vercel

---

## 📊 Monitoring

### A. Vercel Analytics

**Activer :**
1. Vercel Dashboard → Votre projet
2. Analytics → Enable
3. Gratuit pour projets personnels

**Métriques :**
- 📈 Visiteurs uniques
- ⚡ Temps de chargement
- 🌍 Géolocalisation
- 📱 Devices (mobile/desktop)

---

### B. Logs

**Voir les logs en temps réel :**
1. Vercel Dashboard → Votre projet
2. Deployments → Latest
3. Functions → Logs

**Filtrer :**
- Erreurs : `status:error`
- Warning : `status:warning`
- Info : `status:info`

---

## 🎨 Domaine Personnalisé (Optionnel)

### Ajouter un Domaine

1. Achetez un domaine (ex: `artisscan.fr`)

2. Vercel Dashboard :
   - Settings → Domains
   - Add → Entrez votre domaine
   - Suivez les instructions DNS

3. Attendez la propagation (24-48h max)

4. **Résultat :**
   ```
   https://artisscan.fr
   ```

---

## 🔒 Sécurité

### A. Variables d'Environnement

**JAMAIS dans le code :**
- ❌ Clés API en dur
- ❌ Secrets dans Git
- ✅ Toujours via variables d'environnement

### B. Supabase RLS

**Row Level Security activé :**
```sql
-- Seulement l'utilisateur peut voir ses factures
CREATE POLICY "Users can view own scans"
ON scans FOR SELECT
USING (auth.uid() = user_id);

-- Seulement l'utilisateur peut insérer
CREATE POLICY "Users can insert own scans"
ON scans FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Seulement l'utilisateur peut supprimer
CREATE POLICY "Users can delete own scans"
ON scans FOR DELETE
USING (auth.uid() = user_id);
```

---

## 📈 Optimisations Production

### A. Caching

Vercel cache automatiquement :
- ✅ Pages statiques
- ✅ Images optimisées
- ✅ API Routes (avec headers appropriés)

### B. Edge Network

- ✅ CDN global
- ✅ Serveurs dans 70+ régions
- ✅ Latence minimale

### C. Compression

- ✅ Gzip automatique
- ✅ Brotli pour navigateurs modernes
- ✅ Images WebP/AVIF

---

## ✅ Checklist Finale

**Avant de partager l'app :**

- ✅ Déployé sur Vercel
- ✅ Variables d'environnement configurées
- ✅ Tests fonctionnels OK
- ✅ Tests mobile iPhone OK
- ✅ Performance Lighthouse > 90
- ✅ Pas d'erreurs dans les logs
- ✅ Export CSV fonctionne
- ✅ Suppression avec confirmation OK
- ✅ Landing page cohérente
- ✅ Icône sur écran d'accueil OK

---

## 🎉 Félicitations !

**Votre application ArtisScan Expert est en ligne !** 🚀

### URLs Importantes

**Production :**
```
https://artisscan.vercel.app
```

**Dashboard Vercel :**
```
https://vercel.com/dashboard
```

**Repository GitHub :**
```
https://github.com/Horla13/artisscan
```

**Supabase :**
```
https://supabase.com/dashboard
```

**OpenAI :**
```
https://platform.openai.com
```

---

## 📞 Support

### Ressources

**Documentation :**
- Vercel : `https://vercel.com/docs`
- Next.js : `https://nextjs.org/docs`
- Supabase : `https://supabase.com/docs`

**Communauté :**
- Discord Vercel
- Reddit r/nextjs
- Stack Overflow

---

## 🚀 Prochaines Étapes

1. ✅ **Testez l'application** sur plusieurs appareils

2. ✅ **Partagez** avec des utilisateurs beta

3. ✅ **Collectez des retours** et améliorez

4. ✅ **Ajoutez des fonctionnalités** au fil du temps

5. ✅ **Monitorez** les performances et erreurs

---

**🎊 Votre application est LIVE ! Bon lancement ! 🎊**

