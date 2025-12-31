# 📸 ArtisScan - Scanner de Factures Premium

<div align="center">

![ArtisScan](public/logo.svg)

**Gérez vos factures d'artisan avec l'intelligence artificielle**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com/)

</div>

---

## ✨ Fonctionnalités

### 🤖 Analyse IA de Factures
- **Scanner intelligent** avec GPT-4 Vision
- Extraction automatique des données (fournisseur, date, montants)
- **Compression d'images** automatique pour les photos iPhone
- Validation et nettoyage des données

### 📊 Dashboard Visuel Premium
- **Graphique interactif** des 6 derniers mois
- **Statistiques en temps réel** (HT, TVA, TTC)
- Design moderne avec dégradés et animations
- Responsive mobile/desktop

### 💼 Gestion Professionnelle
- Liste complète de toutes les factures
- **Export CSV** optimisé pour les comptables
- Suppression individuelle
- Recherche et tri

### 🎨 Design Premium
- **Police Inter** pour un look professionnel
- **Arrondis généreux** et **ombres profondes**
- **Animations fluides** et effets hover
- **Bouton scanner flottant** sur mobile

---

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 18+
- npm ou yarn
- Compte Supabase
- Clé API OpenAI

### Installation

```bash
# Cloner le projet
git clone https://github.com/votre-username/artisscan.git
cd artisscan

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp env.example.txt .env.local
# Éditer .env.local avec vos clés

# Lancer en développement
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### Configuration

Créez un fichier `.env.local` avec :

```env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
OPENAI_API_KEY=votre_cle_openai
```

---

## 📱 Déploiement

### Vercel (Recommandé)

```bash
npm i -g vercel
vercel
```

### Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod
```

### Configuration iOS

Pour l'icône d'application :

1. Ouvrez `generate-icon.html` dans votre navigateur
2. Téléchargez l'icône générée
3. Placez-la dans `public/apple-touch-icon.png`

---

## 🛠️ Technologies

- **Frontend** : Next.js 14, React 18, TypeScript
- **Styling** : Tailwind CSS, Police Inter
- **Graphiques** : Recharts
- **Backend** : Supabase (PostgreSQL)
- **IA** : OpenAI GPT-4 Vision
- **Animations** : Canvas Confetti

---

## 📚 Documentation

- [📖 Guide de Démarrage Rapide](QUICK_START.md)
- [✨ Fonctionnalités Complètes](FEATURES.md)
- [🎨 Améliorations UI](UI_IMPROVEMENTS.md)
- [📝 Changelog](CHANGELOG.md)
- [📱 Configuration iOS](ICON_SETUP.md)

---

## 🎯 Structure du Projet

```
artisscan/
├── app/
│   ├── api/analyze/      # API d'analyse IA
│   ├── dashboard/        # Dashboard principal
│   ├── login/           # Page de connexion
│   └── layout.tsx       # Layout global
├── lib/
│   └── supabase.ts      # Client Supabase
├── public/
│   ├── logo.svg         # Logo de l'app
│   └── manifest.json    # PWA manifest
└── docs/                # Documentation
```

---

## 🎨 Captures d'Écran

### Dashboard
- Graphique interactif des 6 derniers mois
- Cartes statistiques colorées (HT, TVA, TTC)
- Liste moderne des factures

### Scanner
- Upload d'images optimisé
- Prévisualisation élégante
- Analyse IA en temps réel

### Mobile
- Bouton scanner flottant sticky
- Design responsive
- Icône iOS personnalisée

---

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

## 🙏 Remerciements

- [Next.js](https://nextjs.org/) - Framework React
- [Supabase](https://supabase.com/) - Backend as a Service
- [OpenAI](https://openai.com/) - API GPT-4 Vision
- [Recharts](https://recharts.org/) - Bibliothèque de graphiques
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS

---

## 📞 Support

Pour toute question ou suggestion :

- 📧 Email : support@artisscan.com
- 🐛 Issues : [GitHub Issues](https://github.com/votre-username/artisscan/issues)
- 💬 Discussions : [GitHub Discussions](https://github.com/votre-username/artisscan/discussions)

---

<div align="center">

**Fait avec ❤️ pour les artisans**

[Documentation](QUICK_START.md) • [Fonctionnalités](FEATURES.md) • [Changelog](CHANGELOG.md)

</div>
