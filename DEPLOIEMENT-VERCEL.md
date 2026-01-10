# 🚀 Déploiement Vercel - ArtisScan

## ✅ Déploiement Réussi

**Date :** 4 janvier 2026  
**Branche :** `main`  
**Projet Vercel :** `artisscan` (giovannis-projects-94f85b0b)

---

## 📦 Commits Déployés

### Commit 1 : `bd58f93`
**Titre :** feat: complete PRO-only security system for Dashboard access

**Modifications :**
- ✅ Écran "Accès Restreint" redesigné (gradient, Crown icons, liste avantages)
- ✅ Blocage fonction `triggerFileInput()` pour non-PRO
- ✅ Boutons scan disabled avec overlays visuels
- ✅ Toast d'erreur + redirection `/pricing`

**Fichiers modifiés :**
- `app/dashboard/page.tsx` (+113 insertions, -33 deletions)

---

### Commit 2 : `04a4976`
**Titre :** docs: comprehensive security documentation for PRO-only Dashboard

**Modifications :**
- ✅ Documentation complète de 631 lignes
- ✅ Explications détaillées de chaque niveau de sécurité
- ✅ Scénarios d'utilisation et tests
- ✅ Guide de débogage et maintenance

**Fichiers créés :**
- `SECURITE-DASHBOARD.md` (631 lignes)

---

## 🔗 URLs de Production

**URL Principale :**  
https://artisscan.vercel.app

**URL de Preview :**  
https://artisscan-qu41578h6-giovannis-projects-94f85b0b.vercel.app

**Dashboard Vercel :**  
https://vercel.com/giovannis-projects-94f85b0b/artisscan

---

## 🛠️ Build Details

**Next.js Version :** 16.1.1  
**Build Time :** ~21.9s  
**Turbopack :** Activé  
**TypeScript :** ✅ 0 erreurs  
**Pages générées :** 14/14

**Routes déployées :**
```
○  /                          (Static)
○  /_not-found                (Static)
ƒ  /api/analyze               (Dynamic)
ƒ  /api/checkout              (Dynamic)
ƒ  /api/scans                 (Dynamic)
ƒ  /api/send-accounting       (Dynamic)
ƒ  /api/stripe-webhook        (Dynamic)
○  /dashboard                 (Static)
○  /login                     (Static)
○  /preview-icon              (Static)
○  /pricing                   (Static)
○  /success                   (Static)
```

---

## 🔐 Variables d'Environnement (Vercel)

**⚠️ À VÉRIFIER dans le Dashboard Vercel :**

### Supabase (Obligatoire)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY       ⚠️ SECRET - Ne jamais exposer au client
```

### Stripe (Obligatoire)
```
STRIPE_SECRET_KEY                ⚠️ SECRET - Production uniquement
STRIPE_WEBHOOK_SECRET            ⚠️ SECRET - Pour vérifier les webhooks
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRICE_ID_MONTHLY
STRIPE_PRICE_ID_YEARLY
```

### Brevo (Email)
```
BREVO_API_KEY                    ⚠️ SECRET - Pour envoi emails comptable
BREVO_SENDER_EMAIL               ⚠️ Email expéditeur (ex: contact@artisscan.fr)
BREVO_SENDER_NAME                ⚠️ Nom expéditeur (ex: ArtisScan)
```

### OpenAI (IA Scan)
```
OPENAI_API_KEY                   ⚠️ SECRET - Pour analyse de factures
```

**Comment vérifier :**
1. Aller sur https://vercel.com/giovannis-projects-94f85b0b/artisscan
2. Cliquer sur **Settings > Environment Variables**
3. Vérifier que toutes les variables ci-dessus sont configurées
4. Si manquantes, les ajouter et redéployer

---

## 🔔 Webhook Stripe à Configurer

**⚠️ IMPORTANT :** Après le premier déploiement, configurer le webhook Stripe :

1. Aller sur **Stripe Dashboard > Developers > Webhooks**
2. Cliquer sur **Add endpoint**
3. **URL :** `https://artisscan.vercel.app/api/stripe-webhook`
4. **Events to send :**
   - `checkout.session.completed`
5. **Copier le Signing Secret** (`whsec_...`)
6. **L'ajouter dans Vercel** sous `STRIPE_WEBHOOK_SECRET`
7. **Redéployer** si nécessaire

**Test du webhook :**
```bash
# Depuis Stripe Dashboard > Developers > Webhooks
# Cliquer sur "Send test webhook"
# Sélectionner "checkout.session.completed"
```

**Vérifier les logs Vercel :**
```
✅ RECU DANS WEBHOOK - DEBUT
✅ Client Supabase Admin créé
✅ Événement checkout.session.completed détecté
📧 Email client reçu: xxx@example.com
🔍 Recherche utilisateur par email
✅ Utilisateur trouvé - ID: xxx
📝 Tentative UPDATE is_pro = true + plan = pro
🎉 SUCCÈS: Plan PRO activé
✅ Email de bienvenue envoyé avec succès
```

---

## 🧪 Tests Post-Déploiement

### Test 1 : Accès Non-Connecté
**URL :** https://artisscan.vercel.app/dashboard

**Résultat attendu :**
- ✅ Redirection vers `/login?redirect=/dashboard`

---

### Test 2 : Utilisateur Non-PRO
**Étapes :**
1. Se connecter avec un compte test non-PRO
2. Accéder à `/dashboard`

**Résultat attendu :**
- ✅ Écran "🔒 Accès Restreint" affiché
- ✅ Liste des avantages PRO visible
- ✅ Badge "14 jours d'essai gratuit"
- ✅ Redirection automatique vers `/pricing` après 1,5s

---

### Test 3 : Bouton Scan Bloqué
**Étapes :**
1. Utilisateur non-PRO sur le dashboard (avant redirection)
2. Observer le bouton "NUMÉRISER MAINTENANT"

**Résultat attendu :**
- ✅ Bouton `disabled` (opacity 50%)
- ✅ Overlay avec Crown animée
- ✅ Tooltip "Abonnement PRO requis"
- ✅ Clic → Toast d'erreur + redirection `/pricing`

---

### Test 4 : API Sécurisée
**Commande :**
```bash
# Récupérer le token JWT d'un utilisateur non-PRO
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST https://artisscan.vercel.app/api/scans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invoiceData": {"entreprise": "Test", "montant_ttc": 100}}'
```

**Résultat attendu :**
```json
{
  "error": "Abonnement requis",
  "message": "⛔ Abonnement requis pour accéder à cette fonctionnalité",
  "isPro": false,
  "redirectTo": "/pricing"
}
```
**Status :** `403 Forbidden`

---

### Test 5 : Parcours Complet PRO
**Étapes :**
1. Créer un nouveau compte sur `/login?mode=signup`
2. Redirection vers `/pricing`
3. Cliquer sur "Payer" (mensuel ou annuel)
4. Compléter le paiement Stripe (mode test)
5. Redirection vers `/dashboard`

**Résultat attendu :**
- ✅ Écran "Activation de votre abonnement..." pendant 2-10s
- ✅ Redirection automatique vers le Dashboard
- ✅ Badge "PRO (Essai gratuit)" visible dans le header
- ✅ Boutons de scan actifs et fonctionnels
- ✅ Emails transactionnels envoyés via Brevo

---

## 📊 Monitoring

### Logs Vercel
**URL :** https://vercel.com/giovannis-projects-94f85b0b/artisscan/logs

**Logs à surveiller :**
- `🔒 SÉCURITÉ: Vérification accès Dashboard...`
- `⛔ ACCÈS REFUSÉ: Utilisateur non-PRO détecté`
- `✅ ACCÈS AUTORISÉ: Utilisateur PRO confirmé`
- `🔔 RECU DANS WEBHOOK - DEBUT`
- `🎉 SUCCÈS: Plan PRO activé`

### Erreurs Courantes

#### 1. `Refresh Token is missing`
**Cause :** Session Supabase expirée  
**Solution :** L'utilisateur doit se reconnecter

#### 2. `403 Forbidden sur /api/scans`
**Cause :** Utilisateur non-PRO tente d'uploader  
**Solution :** Normal, c'est la sécurité qui fonctionne

#### 3. `is_pro reste false après paiement`
**Cause :** Webhook Stripe pas configuré ou échoue  
**Solution :** Vérifier les logs du webhook, vérifier `STRIPE_WEBHOOK_SECRET`

#### 4. `Plan reste 'free' après paiement`
**Cause :** Webhook n'a pas mis à jour Supabase  
**Solution :** Manuellement exécuter :
```sql
UPDATE profiles
SET is_pro = TRUE, plan = 'pro', updated_at = NOW()
WHERE email = 'utilisateur@example.com';
```

---

## 🔄 Déploiements Futurs

### Auto-Deploy (Recommandé)
**Vercel est configuré pour déployer automatiquement à chaque push sur `main`.**

Pour vérifier :
1. Aller sur https://vercel.com/giovannis-projects-94f85b0b/artisscan/settings/git
2. S'assurer que **Auto Deploy** est activé pour la branche `main`

### Déploiement Manuel (si besoin)
```bash
cd /Users/giovannirusso/artisscan
npx vercel --prod
```

### Déploiement Preview (branche de test)
```bash
cd /Users/giovannirusso/artisscan
git checkout -b feature/nouvelle-fonctionnalite
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin feature/nouvelle-fonctionnalite
```

**Vercel créera automatiquement une URL de preview :**  
`https://artisscan-git-feature-nouvelle-fonctionnalite-giovannis-projects.vercel.app`

---

## 🎯 Checklist Post-Déploiement

- [ ] Vérifier que toutes les variables d'environnement sont configurées dans Vercel
- [ ] Configurer le webhook Stripe (`checkout.session.completed`)
- [ ] Tester l'accès Dashboard pour utilisateur non-connecté
- [ ] Tester l'écran "Accès Restreint" pour utilisateur non-PRO
- [ ] Tester le blocage du bouton scan
- [ ] Tester l'API `/api/scans` avec un token non-PRO (doit retourner 403)
- [ ] Effectuer un paiement test et vérifier :
  - [ ] Webhook reçu et traité correctement
  - [ ] `is_pro` mis à `true` dans Supabase
  - [ ] Emails transactionnels envoyés via Brevo
  - [ ] Accès au Dashboard accordé
- [ ] Vérifier les logs Vercel pour détecter des erreurs
- [ ] Tester la navigation mobile (bouton central scan)

---

## 📞 Support

**Problèmes de déploiement ?**
1. Vérifier les logs Vercel
2. Vérifier la console du navigateur
3. Vérifier les logs Supabase (Table Editor > profiles)
4. Vérifier les webhooks Stripe (Dashboard > Developers > Webhooks)

**Contact Vercel Support :**  
https://vercel.com/support

**Documentation Vercel :**  
https://vercel.com/docs

---

## 🎉 Statut Final

**Déploiement :** ✅ RÉUSSI  
**Build :** ✅ 0 erreurs  
**Sécurité :** ✅ 3 niveaux actifs  
**Tests :** ⏳ À effectuer en production

**URL Production :**  
🔗 https://artisscan.vercel.app

---

**Prochaine étape :** Effectuer les tests post-déploiement listés ci-dessus pour valider le fonctionnement complet du système de sécurité en production.

