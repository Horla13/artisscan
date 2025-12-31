# 🔧 Résoudre les Variables d'Environnement Vercel

## ⚠️ Erreur Détectée

```
Error: Environment Variable "NEXT_PUBLIC_SUPABASE_URL" 
references Secret "supabase-url", which does not exist.
```

## ✅ Solution Rapide (5 minutes)

### Étape 1 : Dashboard Vercel

1. **Allez sur** : https://vercel.com/dashboard
2. **Sélectionnez** votre projet **artisscan**
3. **Cliquez** sur **Settings** (dans le menu de gauche)
4. **Cliquez** sur **Environment Variables**

### Étape 2 : Supprimer les Anciennes Variables

Si vous voyez des variables qui référencent des secrets (supabase-url, etc.) :
- Cliquez sur le **⋯** à droite
- **Delete** chaque variable

### Étape 3 : Ajouter les Nouvelles Variables

Cliquez sur **Add New** et ajoutez ces 3 variables :

#### Variable 1
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: [Votre URL Supabase]
Environment: Production, Preview, Development
```

#### Variable 2
```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: [Votre clé anonyme Supabase]
Environment: Production, Preview, Development
```

#### Variable 3
```
Name: OPENAI_API_KEY
Value: [Votre clé OpenAI]
Environment: Production, Preview, Development
```

### Étape 4 : Trouver Vos Clés

#### Pour Supabase
1. Allez sur : https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Settings → API
4. Copiez :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### Pour OpenAI
1. Allez sur : https://platform.openai.com/api-keys
2. Créez ou copiez une clé API
3. Collez dans `OPENAI_API_KEY`

### Étape 5 : Redéployer

Après avoir ajouté les variables :

**Option A** : Via Dashboard
- Onglet **Deployments**
- Cliquez sur les **⋯** du dernier déploiement
- **Redeploy**

**Option B** : Via CLI
```bash
npx vercel --prod
```

---

## 🎯 Alternative : Fichier .env.local

Si vous voulez déployer localement d'abord, créez `.env.local` :

```bash
# .env.local (NE PAS COMMIT!)
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-...
```

Puis testez localement :
```bash
npm run build
npm start
```

---

## 📋 Checklist Complète

- [ ] Aller sur Vercel Dashboard
- [ ] Ouvrir Settings → Environment Variables
- [ ] Supprimer les anciennes variables (si nécessaire)
- [ ] Ajouter NEXT_PUBLIC_SUPABASE_URL
- [ ] Ajouter NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] Ajouter OPENAI_API_KEY
- [ ] Sélectionner tous les environnements
- [ ] Sauvegarder
- [ ] Redéployer

---

## 🚀 Après Configuration

Une fois les variables ajoutées :

```bash
# Redéployer
npx vercel --prod

# Ou via dashboard :
# Deployments → Redeploy
```

**Le déploiement devrait fonctionner ! ✅**

---

## 💡 Notes Importantes

### Sécurité
- ⚠️ **NE JAMAIS** committer `.env.local`
- ⚠️ **NE JAMAIS** partager vos clés API
- ✅ Ajoutez `.env.local` dans `.gitignore` (déjà fait)

### Variables Next.js
- Variables avec `NEXT_PUBLIC_` → Accessibles côté client
- Variables sans → Accessibles uniquement côté serveur

### Environnements Vercel
- **Production** : Déploiement principal
- **Preview** : Branches et PR
- **Development** : Développement local

---

## 🆘 Si Problème Persiste

### Vérifier vercel.json

Ouvrez `vercel.json` et vérifiez :
```json
{
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url"  ← Supprimer ces références
  }
}
```

Si vous voyez des `@secret-name`, **supprimez-les** :
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "devCommand": "npm run dev"
}
```

Puis recommitez :
```bash
git add vercel.json
git commit -m "fix: Remove secret references from vercel.json"
git push origin main
```

---

## 🎉 Une Fois Configuré

Les prochains déploiements seront automatiques :

```bash
git add .
git commit -m "feat: nouvelle feature"
git push

# Vercel déploie automatiquement ! 🚀
```

---

**Temps estimé** : 5 minutes  
**Difficulté** : Facile  
**Status** : Configuration unique

**Suivez ces étapes et votre app sera en ligne ! ✨**

