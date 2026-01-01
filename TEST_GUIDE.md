# 🧪 GUIDE DE TEST RAPIDE

## ✅ Test Complet en 2 Minutes

### 1️⃣ Scanner et Valider
```bash
1. Aller sur http://localhost:3000/dashboard
2. Badge en haut à droite : "5/5 scans restants"
3. Cliquer sur le bouton Scanner orange (centre bottom nav)
4. Sélectionner une facture photo
5. ⏳ Attendre l'analyse (spinner + messages rotatifs)
6. 🆕 Popup "Vérification de la facture" s'ouvre
```

### 2️⃣ Vérifier les Champs Pré-remplis
```
✅ Date : Devrait être détectée par l'IA
✅ Nom du fournisseur : Nom de l'entreprise
✅ Montant HT : Montant hors taxes
✅ TVA : Calculée automatiquement (lecture seule)
✅ Montant TTC : Montant toutes taxes comprises
✅ Catégorie : Ex: Matériaux, Carburant, etc.
✅ Description : Optionnel
```

### 3️⃣ Modifier un Champ
```bash
1. Modifier le nom du fournisseur : "BricoMax" → "BricoMax SAS"
2. Modifier le montant HT : 100 → 150
3. Observer la TVA se recalculer automatiquement
4. Modifier le montant TTC : 120 → 180
```

### 4️⃣ Valider et Observer
```bash
1. Cliquer sur "✓ Valider et Enregistrer"
2. ✅ Toast vert "Facture enregistrée !" apparaît
3. 📱 Vibration (si mobile)
4. 🔄 Popup se ferme
5. ✅ Badge : "5/5" → "4/5 scans restants"
6. ✅ Nouvelle carte apparaît en haut de l'historique
7. ✅ Stats mises à jour :
   - Total HT : +150€
   - TVA récupérable : +30€
```

### 5️⃣ Vérifier l'Historique
```bash
1. Aller sur l'onglet "Historique"
2. ✅ Nouvelle facture affichée en premier
3. ✅ Colonne HT : 150.00 €
4. ✅ Colonne TTC : 180.00 €
5. ✅ Catégorie affichée (badge orange)
```

---

## 🚫 Test d'Annulation

### Scénario
```bash
1. Scanner une nouvelle facture
2. Popup s'ouvre
3. Cliquer sur "Annuler"
4. ❌ Rien n'est enregistré
5. ✅ Compteur reste à 4/5
6. ✅ Pas de nouvelle carte dans l'historique
```

---

## 🚫 Test Limite Atteinte

### Scénario
```bash
1. Scanner 4 factures supplémentaires (4→3→2→1→0)
2. Badge : "0/5 scans restants"
3. Cliquer sur Scanner
4. 🚫 Modale "Limite de 5 scans atteinte" s'affiche
5. Message : "Passez au plan Pro pour scanner en illimité !"
6. Bouton orange "Passer à Pro"
```

---

## ✅ Checklist de Validation

- [ ] Popup s'ouvre après scan
- [ ] Tous les champs sont modifiables
- [ ] TVA se calcule automatiquement
- [ ] Bouton "Valider et Enregistrer" fonctionne
- [ ] Bouton "Annuler" ferme la popup
- [ ] Toast de confirmation s'affiche
- [ ] Compteur se décrémente (5→4)
- [ ] Liste se rafraîchit instantanément
- [ ] Colonne TTC affichée dans l'historique
- [ ] Stats recalculées (Total HT, TVA)
- [ ] Graphique 7 jours mis à jour
- [ ] Limite de 5 scans respectée

---

## 🐛 Problèmes Potentiels

### Si la popup ne s'ouvre pas
```typescript
// Vérifier dans la console :
console.log('Pending data:', pendingInvoiceData);
console.log('Show modal:', showValidationModal);
```

### Si le compteur ne se met pas à jour
```typescript
// Vérifier que ces fonctions sont appelées :
await loadInvoices();
await checkSubscriptionLimits();
```

### Si la colonne TTC n'apparaît pas
```typescript
// Vérifier que montant_ttc est bien dans Invoice interface :
interface Invoice {
  montant_ht: number;
  montant_ttc: number; // ✅ Doit être présent
}
```

---

## 📱 Test Mobile

### Utiliser Chrome DevTools
```bash
1. Ouvrir http://localhost:3000/dashboard
2. F12 → Toggle device toolbar (Ctrl+Shift+M)
3. Sélectionner "iPhone 12 Pro"
4. Scanner une facture
5. ✅ Popup scrollable
6. ✅ Inputs tactiles (clavier numérique pour montants)
7. ✅ Haptic feedback après validation
```

---

## 🎉 Si tout fonctionne

```bash
✅ BRAVO ! Les 3 améliorations sont opérationnelles :
  1. Validation manuelle avec popup
  2. Affichage TTC dans l'historique
  3. Rafraîchissement automatique du compteur

Prêt pour :
  - Commit Git
  - Push vers GitHub
  - Déploiement Vercel
```

---

**Guide créé le 01/01/2026** 🚀

