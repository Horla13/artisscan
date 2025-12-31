const fs = require('fs');
const path = require('path');

// Créer un PNG simple en utilisant un data URL
// Cette icône sera un carré orange avec le texte "AS" (ArtisScan)
const canvas = `
<svg width="180" height="180" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#fb923c;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ea580c;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Fond arrondi -->
  <rect width="180" height="180" rx="40" fill="url(#grad)"/>
  
  <!-- Document blanc -->
  <rect x="50" y="35" width="70" height="95" rx="8" fill="rgba(255,255,255,0.95)"/>
  
  <!-- Coin plié -->
  <path d="M 110 35 L 120 35 L 120 45 Z" fill="rgba(255,255,255,0.7)"/>
  
  <!-- Ligne titre orange -->
  <rect x="60" y="50" width="40" height="4" rx="2" fill="#f97316"/>
  
  <!-- Lignes de texte -->
  <rect x="60" y="63" width="50" height="3" rx="1.5" fill="#9ca3af"/>
  <rect x="60" y="71" width="45" height="3" rx="1.5" fill="#9ca3af"/>
  <rect x="60" y="79" width="48" height="3" rx="1.5" fill="#9ca3af"/>
  
  <!-- Montant -->
  <rect x="60" y="100" width="50" height="6" rx="3" fill="#10b981"/>
  <circle cx="65" cy="103" r="2" fill="white"/>
  
  <!-- Lignes laser -->
  <rect x="40" y="80" width="100" height="2" rx="1" fill="rgba(251,191,36,0.8)"/>
  <rect x="40" y="87" width="100" height="1.5" rx="0.75" fill="rgba(251,191,36,0.6)"/>
</svg>
`;

console.log('📱 Génération de l\'icône iOS pour ArtisScan...\n');
console.log('⚠️  Pour générer l\'icône PNG, vous avez deux options :\n');
console.log('Option 1 - Utiliser un convertisseur en ligne :');
console.log('  1. Ouvrez generate-icon.html dans votre navigateur');
console.log('  2. Cliquez sur "Télécharger l\'icône"');
console.log('  3. Placez le fichier téléchargé dans public/apple-touch-icon.png\n');
console.log('Option 2 - Utiliser un outil en ligne :');
console.log('  1. Allez sur https://realfavicongenerator.net/');
console.log('  2. Uploadez public/apple-touch-icon.svg');
console.log('  3. Téléchargez les icônes générées\n');
console.log('Option 3 - Utiliser ImageMagick (si installé) :');
console.log('  brew install imagemagick');
console.log('  convert -background none -resize 180x180 public/apple-touch-icon.svg public/apple-touch-icon.png\n');
console.log('✅ Le fichier layout.tsx a déjà été configuré avec les meta tags iOS !');

