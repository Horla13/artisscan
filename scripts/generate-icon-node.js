const fs = require('fs');
const { createCanvas } = require('canvas');

// Créer un canvas 180x180
const canvas = createCanvas(180, 180);
const ctx = canvas.getContext('2d');

// Fonction helper pour dessiner des rectangles arrondis
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Fond dégradé orange
const gradient = ctx.createLinearGradient(0, 0, 180, 180);
gradient.addColorStop(0, '#fb923c');
gradient.addColorStop(1, '#ea580c');

// Rectangle arrondi pour le fond
ctx.fillStyle = gradient;
roundRect(ctx, 0, 0, 180, 180, 40);
ctx.fill();

// Document blanc
ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
roundRect(ctx, 50, 35, 70, 95, 8);
ctx.fill();

// Coin plié
ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
ctx.beginPath();
ctx.moveTo(110, 35);
ctx.lineTo(120, 35);
ctx.lineTo(120, 45);
ctx.closePath();
ctx.fill();

// Ligne de titre orange
ctx.fillStyle = '#f97316';
roundRect(ctx, 60, 50, 40, 4, 2);
ctx.fill();

// Lignes de texte grises
ctx.fillStyle = '#9ca3af';
roundRect(ctx, 60, 63, 50, 3, 1.5);
ctx.fill();
roundRect(ctx, 60, 71, 45, 3, 1.5);
ctx.fill();
roundRect(ctx, 60, 79, 48, 3, 1.5);
ctx.fill();

// Montant en vert (en bas)
ctx.fillStyle = '#10b981';
roundRect(ctx, 60, 100, 50, 6, 3);
ctx.fill();

// Point blanc sur le montant
ctx.fillStyle = 'white';
ctx.beginPath();
ctx.arc(65, 103, 2, 0, Math.PI * 2);
ctx.fill();

// Lignes de scan laser (effet scanner)
ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
roundRect(ctx, 40, 80, 100, 2, 1);
ctx.fill();

ctx.fillStyle = 'rgba(251, 191, 36, 0.6)';
roundRect(ctx, 40, 87, 100, 1.5, 0.75);
ctx.fill();

// Sauvegarder l'image
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('public/apple-touch-icon.png', buffer);

console.log('✅ Icône générée avec succès : public/apple-touch-icon.png');
console.log('📱 Taille : 180x180 pixels');
console.log('🎨 Format : PNG avec transparence');

