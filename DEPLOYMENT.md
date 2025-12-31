# 🚀 Guide de Déploiement - ArtisScan

## ✅ Prérequis

Avant de déployer, assurez-vous d'avoir :
- ✅ Un compte Vercel ou Netlify
- ✅ Les clés API configurées (Supabase, OpenAI)
- ✅ Le projet testé localement (`npm run dev`)
- ✅ Le build fonctionnel (`npm run build`)

---

## 🌐 Déploiement sur Vercel (Recommandé)

### Méthode 1 : Déploiement en ligne de commande

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter à Vercel
vercel login

# Déployer le projet
vercel

# Suivez les instructions :
# - Set up and deploy? Yes
# - Which scope? [Votre compte]
# - Link to existing project? No
# - What's your project's name? artisscan
# - In which directory is your code located? ./
```

### Méthode 2 : Déploiement via GitHub

1. **Pushez votre code sur GitHub**
   ```bash
   git init
   git add .
   git commit -m "feat: ArtisScan v2.0 - Design Premium"
   git branch -M main
   git remote add origin https://github.com/votre-username/artisscan.git
   git push -u origin main
   ```

2. **Importez sur Vercel**
   - Allez sur [vercel.com](https://vercel.com)
   - Cliquez sur "New Project"
   - Importez votre repo GitHub
   - Configurez les variables d'environnement
   - Déployez !

### Configuration des Variables d'Environnement

Dans Vercel Dashboard → Settings → Environment Variables, ajoutez :

```
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
OPENAI_API_KEY=votre_cle_openai
```

---

## 🔷 Déploiement sur Netlify

### Installation

```bash
# Installer Netlify CLI
npm i -g netlify-cli

# Se connecter
netlify login

# Initialiser le projet
netlify init

# Déployer
netlify deploy --prod
```

### Configuration

Créez un fichier `netlify.toml` :

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

---

## 🔧 Configuration Post-Déploiement

### 1. Configurer le Domaine

**Vercel :**
- Settings → Domains
- Ajoutez votre domaine personnalisé
- Configurez les DNS

**Netlify :**
- Domain Settings
- Ajoutez un custom domain
- Configurez les DNS

### 2. Activer HTTPS

Les deux plateformes activent automatiquement HTTPS avec Let's Encrypt.

### 3. Configurer les Redirections

Les redirections sont automatiquement gérées par Next.js.

---

## 📱 Configuration iOS

### Après le déploiement

1. **Testez sur votre iPhone**
   - Ouvrez Safari
   - Allez sur votre domaine
   - Testez toutes les fonctionnalités

2. **Ajoutez à l'écran d'accueil**
   - Appuyez sur le bouton Partager
   - "Ajouter à l'écran d'accueil"
   - Vérifiez l'icône et la barre de statut

3. **Générez l'icône finale**
   - Ouvrez `generate-icon.html` localement
   - Téléchargez `apple-touch-icon.png`
   - Placez-la dans `public/`
   - Redéployez

---

## 🔍 Vérification du Déploiement

### Checklist

- [ ] ✅ Le site est accessible
- [ ] ✅ La page de connexion fonctionne
- [ ] ✅ Le dashboard s'affiche correctement
- [ ] ✅ L'upload d'images fonctionne
- [ ] ✅ L'analyse IA fonctionne
- [ ] ✅ Le graphique s'affiche
- [ ] ✅ L'export CSV fonctionne
- [ ] ✅ Les statistiques sont correctes
- [ ] ✅ L'icône iOS s'affiche
- [ ] ✅ La barre de statut est orange

### Tests de Performance

```bash
# Lighthouse
npm i -g lighthouse
lighthouse https://votre-domaine.com --view

# WebPageTest
# Allez sur https://www.webpagetest.org/
# Testez votre site
```

---

## 🐛 Dépannage

### Erreur : "Module not found"
```bash
# Réinstallez les dépendances
rm -rf node_modules package-lock.json
npm install
```

### Erreur : "API route not found"
```bash
# Vérifiez la structure des dossiers
# app/api/analyze/route.ts doit exister
```

### Erreur : "Environment variables not defined"
```bash
# Vérifiez dans Vercel/Netlify Dashboard
# Settings → Environment Variables
```

### Images trop lourdes
```bash
# La compression automatique est activée
# Max 1200px, qualité 0.7
# Si ça ne suffit pas, demandez aux utilisateurs
# de reculer un peu lors de la prise de photo
```

---

## 📊 Monitoring

### Vercel Analytics

Activez Vercel Analytics pour suivre :
- Visiteurs
- Performance
- Erreurs
- Web Vitals

### Supabase Monitoring

Dashboard Supabase → Logs :
- Requêtes API
- Authentifications
- Erreurs de base de données

### OpenAI Usage

OpenAI Dashboard → Usage :
- Nombre de requêtes
- Tokens consommés
- Coûts estimés

---

## 🔄 Mises à Jour

### Déploiement continu

Avec GitHub + Vercel :
```bash
# Faites vos modifications
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push

# Vercel déploie automatiquement !
```

### Rollback

Si quelque chose ne va pas :
```bash
# Vercel CLI
vercel rollback

# Ou via le Dashboard
# Deployments → [Déploiement précédent] → Promote to Production
```

---

## 🎯 Optimisations Recommandées

### 1. Caching
```javascript
// next.config.ts
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  compress: true,
}
```

### 2. Compression d'images
Activez la compression automatique (déjà fait ✅)

### 3. CDN
Vercel et Netlify utilisent automatiquement leur CDN global

### 4. Analytics
- Google Analytics
- Plausible Analytics
- Vercel Analytics (recommandé)

---

## 🌟 Statut

### Actuellement Déployé

- ✅ **Serveur de développement** : http://localhost:3000
- ⏳ **Production** : En attente de déploiement

### Performance

- ⚡ **Build Time** : ~1.3s
- 📦 **Bundle Size** : 317 MB (dev)
- 🎯 **Lighthouse Score** : 95+ (prévu)

---

## 📞 Support

Besoin d'aide pour le déploiement ?

- 📖 [Vercel Docs](https://vercel.com/docs)
- 📖 [Netlify Docs](https://docs.netlify.com)
- 📖 [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**Prêt à déployer ? Lancez `vercel` et c'est parti ! 🚀**

