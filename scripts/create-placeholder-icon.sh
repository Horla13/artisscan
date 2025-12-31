#!/bin/bash

# Script pour créer une icône placeholder si nécessaire
# Utilise ImageMagick si disponible, sinon crée un placeholder simple

echo "🎨 Création de l'icône iOS pour ArtisScan..."

# Vérifier si l'icône existe déjà
if [ -f "public/apple-touch-icon.png" ]; then
    echo "✅ L'icône existe déjà: public/apple-touch-icon.png"
    exit 0
fi

# Essayer avec ImageMagick si disponible
if command -v convert &> /dev/null; then
    echo "📦 ImageMagick détecté, conversion du SVG..."
    convert -background none -resize 180x180 public/apple-touch-icon.svg public/apple-touch-icon.png 2>/dev/null
    
    if [ -f "public/apple-touch-icon.png" ]; then
        echo "✅ Icône créée avec ImageMagick !"
        exit 0
    fi
fi

# Sinon, créer un placeholder coloré basique
echo "🎨 Création d'un placeholder temporaire..."
echo "💡 Pour une icône parfaite, ouvrez generate-icon.html dans votre navigateur"
echo "   et téléchargez l'icône générée vers public/apple-touch-icon.png"

# Créer un fichier texte comme placeholder
cat > public/apple-touch-icon-instructions.txt << EOF
Pour générer l'icône iOS :

Option 1 - Générateur intégré (RECOMMANDÉ) :
1. Ouvrez http://localhost:3000/generate-icon.html dans votre navigateur
2. Cliquez sur "Télécharger l'icône"
3. Déplacez apple-touch-icon.png vers le dossier public/

Option 2 - ImageMagick :
brew install imagemagick librsvg
convert -background none -resize 180x180 public/apple-touch-icon.svg public/apple-touch-icon.png

Option 3 - En ligne :
Allez sur https://realfavicongenerator.net/
Uploadez public/apple-touch-icon.svg
Téléchargez l'icône générée
EOF

echo "📄 Instructions créées dans: public/apple-touch-icon-instructions.txt"
echo ""
echo "🌐 Pour générer l'icône maintenant, ouvrez:"
echo "   http://localhost:3000/generate-icon.html"
echo ""

