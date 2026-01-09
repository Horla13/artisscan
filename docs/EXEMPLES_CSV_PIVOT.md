# Exemples CSV comptable (Pivot) — ArtisScan

## Format garanti

- **Encodage**: UTF-8 (avec BOM pour Excel)
- **Séparateur**: `;`
- **Décimales**: virgule `,`
- **Dates**: `JJ/MM/AAAA`

## Colonnes

`Date;Fournisseur;Numéro facture;Montant HT;Montant TVA;Montant TTC;Catégorie;Date d’ajout;Modifié manuellement`

## Exemple 1 — Facture avec TVA (20%)

```csv
Date;Fournisseur;Numéro facture;Montant HT;Montant TVA;Montant TTC;Catégorie;Date d’ajout;Modifié manuellement
05/01/2026;"LEROY MERLIN";"FAC-2026-001";125,00;25,00;150,00;"Matériaux";06/01/2026;non
```

## Exemple 2 — Facture sans TVA (TVA = 0)

```csv
Date;Fournisseur;Numéro facture;Montant HT;Montant TVA;Montant TTC;Catégorie;Date d’ajout;Modifié manuellement
07/01/2026;"LA POSTE";"RECU-8721";12,50;0,00;12,50;"Services/Abonnements";07/01/2026;oui
```

## Règles de cohérence (bloquantes)

- \( |(HT + TVA) - TTC| \le 0,05 \)
- Les champs critiques ne doivent pas être vides (Date, Fournisseur, HT/TVA/TTC).


