# 📱 Configuration de l'icône iOS

## ✅ Ce qui est déjà configuré

Votre application est déjà configurée avec :
- ✓ Meta tags iOS pour la barre de statut orange
- ✓ Configuration PWA (Progressive Web App)
- ✓ Manifest.json avec thème orange
- ✓ Icône SVG créée dans `public/apple-touch-icon.svg`

## 🎨 Générer l'icône PNG (3 options)

### Option 1 : Utiliser le générateur intégré (RECOMMANDÉ) ⭐

1. Ouvrez le fichier `generate-icon.html` dans votre navigateur
   ```bash
   open generate-icon.html
   ```

2. Cliquez sur le bouton "📥 Télécharger l'icône"

3. Déplacez le fichier téléchargé dans le dossier `public/`
   ```bash
   mv ~/Downloads/apple-touch-icon.png public/
   ```

### Option 2 : Utiliser un convertisseur en ligne

1. Allez sur [RealFaviconGenerator](https://realfavicongenerator.net/)
2. Uploadez le fichier `public/apple-touch-icon.svg`
3. Téléchargez les icônes générées
4. Placez `apple-touch-icon.png` dans `public/`

### Option 3 : Utiliser ImageMagick (ligne de commande)

```bash
# Installer ImageMagick (si pas déjà fait)
brew install imagemagick librsvg

# Convertir le SVG en PNG
convert -background none -resize 180x180 public/apple-touch-icon.svg public/apple-touch-icon.png
```

## 📱 Tester sur iPhone

1. Déployez votre application (Vercel, Netlify, etc.)

2. Ouvrez Safari sur votre iPhone

3. Allez sur votre site

4. Appuyez sur le bouton "Partager" 📤

5. Sélectionnez "Ajouter à l'écran d'accueil"

6. Votre icône et la barre de statut orange apparaîtront ! 🎉

## 🎨 Personnalisation des couleurs

La barre de statut utilise actuellement `#f97316` (orange-500).

Pour changer la couleur, modifiez dans `app/layout.tsx` :
```typescript
<meta name="theme-color" content="#VOTRE_COULEUR" />
```

Et dans `public/manifest.json` :
```json
"theme_color": "#VOTRE_COULEUR",
"background_color": "#VOTRE_COULEUR"
```

## 🚀 Résultat final

Une fois configuré, votre application aura :
- ✅ Une belle icône sur l'écran d'accueil iOS
- ✅ Une barre de statut orange assortie au design
- ✅ Un affichage plein écran (mode standalone)
- ✅ Une expérience utilisateur native

Profitez bien d'ArtisScan ! 📸✨

