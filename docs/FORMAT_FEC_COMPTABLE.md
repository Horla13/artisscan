# 📊 FORMAT FEC COMPTABLE - ArtisScan

## 🎯 **Objectif**

Export CSV comptable **FEC-compatible** (Fichier des Écritures Comptables) pour une importabilité universelle dans **Sage, Cegid, EBP** et tous les logiciels comptables français.

---

## ⚙️ **Spécifications Techniques**

### **Format de fichier :**
- **Extension** : `.csv`
- **Encodage** : `UTF-8 avec BOM` (pour compatibilité Excel)
- **Séparateur de champs** : Point-virgule `;` (standard Excel FR)
- **Séparateur décimal** : Virgule `,` (exemple : `1250,50`)
- **Format de date** : `DD/MM/YYYY` (exemple : `05/01/2026`)

### **Colonnes FEC (18 obligatoires) :**

| N° | Colonne | Type | Format | Exemple | Obligatoire |
|---|---|---|---|---|---|
| 1 | **JournalCode** | String(3) | Alphanumérique | `AC`, `VT` | ✓ |
| 2 | **JournalLibelle** | String(100) | Texte | `Achats`, `Ventes` | ✓ |
| 3 | **EcritureNum** | String(20) | Unique | `FAC20260105-001` | ✓ |
| 4 | **EcritureDate** | Date | DD/MM/YYYY | `05/01/2026` | ✓ |
| 5 | **CompteNum** | String(20) | PCG | `606000`, `445660` | ✓ |
| 6 | **CompteLibelle** | String(100) | Texte | `Achats non stockés` | ✓ |
| 7 | **CompAuxNum** | String(20) | Code tiers | `FOUR_DURAND` | Si tiers |
| 8 | **CompAuxLibelle** | String(100) | Nom tiers | `Durand SAS` | Si tiers |
| 9 | **PieceRef** | String(20) | N° facture | `FAC-2026-001` | ✓ |
| 10 | **PieceDate** | Date | DD/MM/YYYY | `05/01/2026` | ✓ |
| 11 | **EcritureLib** | String(200) | Description | `Fournitures bureau` | ✓ |
| 12 | **Debit** | Decimal | 0,00 | `1250,50` | ✓ ou vide |
| 13 | **Credit** | Decimal | 0,00 | `1250,50` | ✓ ou vide |
| 14 | **EcritureLettrage** | String(3) | Code | `AA` | Optionnel |
| 15 | **DateLettrage** | Date | DD/MM/YYYY | `15/02/2026` | Optionnel |
| 16 | **ValidDate** | Date | DD/MM/YYYY | `05/01/2026` | ✓ |
| 17 | **MontantDevise** | Decimal | 0,00 | `1250,50` | Optionnel |
| 18 | **Idevise** | String(3) | ISO 4217 | `EUR` | ✓ |

---

## 📐 **Principe d'Équilibre Comptable**

### **Règle fondamentale :**
```
Pour chaque pièce comptable :
TOTAL DÉBIT = TOTAL CRÉDIT
```

### **Exemple 1 : Facture d'ACHAT (1200€ TTC)**

```
Fournisseur : Durand SAS
HT : 1000,00 €
TVA 20% : 200,00 €
TTC : 1200,00 €
```

**Écritures comptables :**

| Ligne | Compte | Libellé | Débit | Crédit |
|---|---|---|---|---|
| 1 | **606000** | Achats non stockés | `1000,00` | - |
| 2 | **445660** | TVA déductible | `200,00` | - |
| 3 | **401000** | Fournisseurs (Durand SAS) | - | `1200,00` |
| | | **TOTAL** | **1200,00** | **1200,00** |

✅ **Équilibre validé : 1200€ = 1200€**

---

### **Exemple 2 : Facture de VENTE (2400€ TTC)**

```
Client : Martin SARL
HT : 2000,00 €
TVA 20% : 400,00 €
TTC : 2400,00 €
```

**Écritures comptables :**

| Ligne | Compte | Libellé | Débit | Crédit |
|---|---|---|---|---|
| 1 | **411000** | Clients (Martin SARL) | `2400,00` | - |
| 2 | **706000** | Prestations de services | - | `2000,00` |
| 3 | **445710** | TVA collectée | - | `400,00` |
| | | **TOTAL** | **2400,00** | **2400,00** |

✅ **Équilibre validé : 2400€ = 2400€**

---

## 📄 **Exemple de Fichier CSV FEC**

**Nom : `export_comptable_FEC_janvier_2026.csv`**

```csv
JournalCode;JournalLibelle;EcritureNum;EcritureDate;CompteNum;CompteLibelle;CompAuxNum;CompAuxLibelle;PieceRef;PieceDate;EcritureLib;Debit;Credit;EcritureLettrage;DateLettrage;ValidDate;MontantDevise;Idevise
AC;Achats;FAC20260105-001;05/01/2026;606000;Achats non stockés de matières et fournitures;;;FAC-2026-001;05/01/2026;Fournitures de bureau - Durand SAS;1000,00;;;;;;EUR
AC;Achats;FAC20260105-001;05/01/2026;445660;TVA déductible sur autres biens et services;;;FAC-2026-001;05/01/2026;TVA 20% - Fournitures de bureau;200,00;;;;;;EUR
AC;Achats;FAC20260105-001;05/01/2026;401000;Fournisseurs;FOUR_DURAND;Durand SAS;FAC-2026-001;05/01/2026;Fournitures de bureau - Durand SAS;;1200,00;;;;EUR
VT;Ventes;FAC20260106-001;06/01/2026;411000;Clients;CLI_MARTIN;Martin SARL;FAC-2026-002;06/01/2026;Prestation de service - Martin SARL;2400,00;;;;;;EUR
VT;Ventes;FAC20260106-001;06/01/2026;706000;Prestations de services;;;FAC-2026-002;06/01/2026;Prestation de service - Martin SARL;;2000,00;;;;EUR
VT;Ventes;FAC20260106-001;06/01/2026;445710;TVA collectée;;;FAC-2026-002;06/01/2026;TVA 20% sur prestation;;400,00;;;;EUR
```

**Totaux :**
- Total Débit : `3600,00 €` (1000 + 200 + 2400)
- Total Crédit : `3600,00 €` (1200 + 2000 + 400)
- ✅ **Équilibre global validé**

---

## 🔐 **Validation Automatique**

### **Fonction TypeScript de validation :**

```typescript
function validateEquilibre(ecritures: LigneEcriture[]): {
  valid: boolean;
  totalDebit: number;
  totalCredit: number;
  error?: string;
} {
  // Grouper par EcritureNum (pièce comptable)
  const groupes = ecritures.reduce((acc, ligne) => {
    if (!acc[ligne.ecritureNum]) {
      acc[ligne.ecritureNum] = [];
    }
    acc[ligne.ecritureNum].push(ligne);
    return acc;
  }, {} as Record<string, LigneEcriture[]>);

  // Vérifier l'équilibre pour CHAQUE pièce
  for (const [ecritureNum, lignes] of Object.entries(groupes)) {
    const totalDebit = lignes.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = lignes.reduce((sum, l) => sum + (l.credit || 0), 0);
    
    // Tolérance de 0.01€ pour les arrondis
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return {
        valid: false,
        totalDebit,
        totalCredit,
        error: `Écriture ${ecritureNum} non équilibrée : Débit ${totalDebit.toFixed(2)}€ ≠ Crédit ${totalCredit.toFixed(2)}€`
      };
    }
  }

  const totalDebit = ecritures.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = ecritures.reduce((sum, l) => sum + (l.credit || 0), 0);

  return { valid: true, totalDebit, totalCredit };
}
```

**Log de validation :**
```
✅ Équilibre comptable validé : Débit 3600,00€ = Crédit 3600,00€
```

**En cas d'erreur :**
```
❌ Erreur équilibre comptable: Écriture FAC20260105-001 non équilibrée : Débit 1200,00€ ≠ Crédit 1150,00€
```

---

## 🏢 **Plan Comptable Général (PCG) utilisé**

### **Comptes d'ACHATS :**
| Compte | Libellé | Usage |
|---|---|---|
| **606000** | Achats non stockés de matières et fournitures | Achats de biens |
| **445660** | TVA déductible sur autres biens et services | TVA récupérable |
| **401000** | Fournisseurs | Dette fournisseur |

### **Comptes de VENTES :**
| Compte | Libellé | Usage |
|---|---|---|
| **411000** | Clients | Créance client |
| **706000** | Prestations de services | Produit de vente |
| **445710** | TVA collectée | TVA à reverser |

### **Codes Journaux :**
| Code | Libellé | Type |
|---|---|---|
| **AC** | Achats | Factures fournisseurs |
| **VT** | Ventes | Factures clients |
| **OD** | Opérations Diverses | Divers |

---

## 📥 **Import dans les logiciels comptables**

### **Sage Compta & Gestion :**
1. Menu `Fichier` → `Importer` → `Format personnalisé`
2. Sélectionner le fichier CSV FEC
3. Mapper les colonnes (détection automatique)
4. Valider l'import

### **Cegid (Quadratus, Yourcegid) :**
1. Module `Import/Export`
2. Format `FEC standard`
3. Sélectionner le fichier
4. Contrôle d'équilibre automatique
5. Import

### **EBP Compta :**
1. `Outils` → `Import de données`
2. Type : `Écritures comptables`
3. Format : `CSV (point-virgule)`
4. Import avec validation

---

## ✅ **Avantages du Format FEC**

| Avantage | Description |
|---|---|
| **Universel** | Compatible tous logiciels FR (Sage, Cegid, EBP, etc.) |
| **Équilibré** | Validation automatique Débit = Crédit |
| **Normalisé** | Respect strict du FEC français |
| **Complet** | 18 colonnes standard (plan comptable, tiers, etc.) |
| **Traçable** | Numéro de pièce unique, dates, références |
| **Audit-proof** | Format reconnu par l'administration fiscale |

---

## 🚀 **Utilisation dans ArtisScan**

1. **Dashboard** → Sélectionner les factures
2. Cliquer sur **"Envoyer au comptable"**
3. Email envoyé automatiquement avec **2 pièces jointes** :
   - **PDF** : Récapitulatif visuel
   - **CSV FEC** : Import comptable direct

**Format du fichier CSV :**
- Nom : `export_comptable_FEC_[période].csv`
- Encodage : UTF-8 avec BOM
- Séparateur : Point-virgule (;)
- Décimale : Virgule (,)
- Équilibre : Validé automatiquement

---

## 📞 **Support**

Pour toute question sur le format FEC ou l'import comptable :
- Email : **contact@artisscan.fr**
- Site : **https://www.artisscan.fr**

---

**© 2026 ArtisScan - Gestion intelligente pour artisans**

