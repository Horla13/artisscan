# 🎯 GUIDE RAPIDE - VÉRIFICATION POST-RESTAURATION

## ✅ CHECKLIST DE VÉRIFICATION IMMÉDIATE

### 1️⃣ Lancer l'Application
```bash
cd /Users/giovannirusso/artisscan
npm run dev
```
➡️ Ouvrir : `http://localhost:3000/dashboard`

---

## 🔍 TESTS À EFFECTUER (5 MINUTES)

### ✅ Test 1 : Dashboard Gris Anthracite
**Où regarder** : Vue d'ensemble en haut du Dashboard

**Attendu** :
- ✅ Fond gris anthracite foncé (#1a1a1a)
- ✅ Texte blanc visible
- ✅ Barre de progression orange/verte/rouge selon le pourcentage

**Si problème** : Le CSS est peut-être en cache → `Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac)

---

### ✅ Test 2 : Boutons PDF/Excel/CSV
**Où regarder** : Onglet "Projets" → Sur chaque carte de projet

**Attendu** :
- ✅ 3 petits boutons en bas de chaque carte
- ✅ Bouton "PDF" (orange)
- ✅ Bouton "Excel" (vert)
- ✅ Bouton "CSV" (gris)

**Action** :
1. Cliquer sur "PDF" → Un fichier PDF doit se télécharger
2. Ouvrir le PDF → Vérifier que les montants s'affichent "7 000,00 €" (pas de slashes)
3. Vérifier que le logo/nom entreprise apparaît (si configuré dans Paramètres)

---

### ✅ Test 3 : Export Excel Complet
**Où regarder** : Onglet "Projets" → Cliquer sur "Excel" d'un projet

**Attendu** :
- ✅ Fichier `.xlsx` téléchargé
- ✅ Ouvrir le fichier → Onglet "Bilan Chantier" présent
- ✅ 8 colonnes visibles : Date, Fournisseur, Catégorie, Description, HT (€), TVA (%), Montant TVA (€), TTC (€)
- ✅ Ligne "TOTAL" en bas avec les sommes

---

### ✅ Test 4 : Archivage avec Confirmation
**Où regarder** : Onglet "Projets" → Icône de boîte d'archive sur une carte

**Attendu** :
1. Cliquer sur l'icône d'archive
2. ✅ Popup de confirmation apparaît : "Êtes-vous sûr de vouloir archiver ce projet ?"
3. Cliquer sur "OK"
4. ✅ Toast vert : "📦 Projet archivé avec succès"
5. Le projet disparaît de la liste
6. Cliquer sur "Voir les archives"
7. ✅ Le projet apparaît en gris avec opacité réduite

**Restauration** :
1. Cliquer sur l'icône de restauration (flèche circulaire)
2. ✅ Popup : "Êtes-vous sûr de vouloir restaurer ce projet ?"
3. ✅ Le projet revient dans la liste des projets actifs

---

### ✅ Test 5 : Suppression de Facture Sécurisée
**Où regarder** : Onglet "Historique" → Icône corbeille rouge sur une facture

**Attendu** :
1. Cliquer sur la corbeille
2. ✅ Modal apparaît avec :
   - Titre : "Confirmer la suppression"
   - Message : "Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible."
   - Bouton "Annuler" (gris)
   - Bouton "Supprimer" (rouge)
3. Cliquer sur "Annuler"
4. ✅ Le modal se ferme sans rien supprimer
5. Cliquer à nouveau sur la corbeille
6. Cliquer sur "Supprimer"
7. ✅ Toast vert : "Facture supprimée !"
8. ✅ La facture disparaît de la liste

---

### ✅ Test 6 : Suppression de Projet (2 Options)
**Où regarder** : Onglet "Projets" → Icône corbeille sur une carte projet

**Attendu** :
1. Cliquer sur la corbeille
2. ✅ Modal apparaît avec icône corbeille rouge
3. ✅ Titre : "Supprimer le projet ?"
4. ✅ Message : "Que souhaites-tu faire des données de ce chantier ?"
5. ✅ 3 options :
   - "Supprimer uniquement le chantier" (gris)
   - "Tout supprimer (Chantier + Factures)" (rouge)
   - "Annuler" (texte simple)

**Test Option A** :
1. Cliquer sur "Supprimer uniquement le chantier"
2. ✅ Le projet est supprimé
3. ✅ Les factures restent visibles dans l'Historique avec "Sans chantier"

**Test Option B** (ATTENTION : irréversible) :
1. Cliquer sur "Tout supprimer (Chantier + Factures)"
2. ✅ Le projet ET toutes ses factures sont supprimés
3. ✅ Plus aucune trace dans l'Historique

---

## 🛠️ SI UN TEST ÉCHOUE

### Problème : Dashboard toujours bleu au lieu de gris
**Solution** :
1. Vérifier dans le code source (F12 → Inspecteur) si la classe `bg-[#1a1a1a]` est bien présente
2. Si oui, c'est le cache : `Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac)
3. Si non, vérifier que le fichier `/app/dashboard/page.tsx` contient bien ligne 1559 : `bg-[#1a1a1a]`

### Problème : Boutons PDF/Excel/CSV absents
**Solution** :
1. Vérifier que vous êtes bien dans l'onglet "Projets"
2. Vérifier que vous avez au moins 1 projet créé
3. Vérifier dans le code (F12 → Inspecteur) si les boutons existent mais sont cachés (CSS)

### Problème : PDF avec slashes "/" dans les montants
**Solution** :
1. Vérifier que la fonction `formatPDFCurrency` (ligne 1045) contient bien :
   ```typescript
   return formatted.replace(/\u202F/g, ' ').replace(/\u00A0/g, ' ') + ' €';
   ```
2. Si oui, le problème vient peut-être du navigateur → Tester dans un autre navigateur

### Problème : Logo n'apparaît pas dans le PDF
**Solution** :
1. Aller dans "Paramètres" (icône engrenage)
2. Uploader un logo d'entreprise
3. Saisir le nom, l'adresse et le SIRET
4. Sauvegarder
5. Régénérer le PDF

### Problème : Aucune confirmation avant suppression
**Solution** :
1. Vérifier que les modals ne sont pas bloqués par un AdBlock
2. Vérifier la console navigateur (F12 → Console) pour des erreurs JavaScript
3. Vérifier que les lignes 2999-3022 (modal facture) et 3025-3055 (modal projet) sont présentes

---

## 🎉 SI TOUS LES TESTS PASSENT

**Félicitations ! Ton application ArtisScan Expert est 100% Opérationnelle !** 🚀

### Fonctionnalités Disponibles :
✅ **Bloc 1** : Scan de factures avec OCR  
✅ **Bloc 2** : Suivi budgétaire et alertes  
✅ **Bloc 3** : Rapports PDF et Excel professionnels  
✅ **Bloc 4** : Archivage et interface moderne  

### Prochaines Étapes :
1. **Configurer ton logo** : Aller dans Paramètres → Uploader ton logo
2. **Créer tes projets** : Onglet Projets → + Nouveau Projet
3. **Scanner des factures** : Bouton caméra central → Prendre photo
4. **Générer des bilans** : Cliquer sur PDF/Excel/CSV sur chaque projet

---

## 📞 BESOIN D'AIDE ?

### Logs à Vérifier
1. **Console Navigateur** : `F12` → Onglet "Console"
2. **Réseau** : `F12` → Onglet "Network" (vérifier les appels Supabase)
3. **Supabase Dashboard** : Vérifier que la table `projects` a bien la colonne `status`

### Commandes Utiles
```bash
# Vérifier les dépendances
npm list jspdf jspdf-autotable xlsx

# Réinstaller si besoin
npm install jspdf jspdf-autotable xlsx

# Nettoyer le cache Next.js
rm -rf .next
npm run dev
```

---

**✅ CHECKLIST COMPLÈTE**  
**Version Restauration Post-Plantage v2.0**  
**Tous les tests devraient passer à 100%** 🎯

