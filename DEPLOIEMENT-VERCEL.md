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
ƒ  /api/scans                 (Dynamic)
ƒ  /api/send-accounting       (Dynamic)
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

### Stripe (Paiements / Abonnements)
```
STRIPE_SECRET_KEY                ⚠️ SECRET - Production uniquement
STRIPE_WEBHOOK_SECRET            ⚠️ SECRET - Signature webhook
STRIPE_PRICE_ID_MONTHLY          ⚠️ ID du prix mensuel (Stripe Dashboard)
STRIPE_PRICE_ID_YEARLY           ⚠️ ID du prix annuel (Stripe Dashboard)
SITE_URL                         ⚠️ URL prod (ex: https://artisscan.vercel.app)
```

**Comment vérifier :**
1. Aller sur https://vercel.com/giovannis-projects-94f85b0b/artisscan
2. Cliquer sur **Settings > Environment Variables**
3. Vérifier que toutes les variables ci-dessus sont configurées
4. Si manquantes, les ajouter et redéployer

---

## 🧪 Tests Post-Déploiement

### Test 1 : Accès Non-Connecté
**URL :** https://artisscan.vercel.app/dashboard

**Résultat attendu :**
- ✅ Redirection vers `/login?redirect=/dashboard`

---

### Test 2 : Utilisateur Non-Connecté (Redirection Login)
**Étapes :**
1. Accéder à `/dashboard` sans être connecté.

**Résultat attendu :**
- ✅ Redirection automatique vers `/login`.

---

### Test 3 : Bouton Scan (Fonctionnement Standard)
**Étapes :**
1. Se connecter.
2. Accéder au dashboard.
3. Cliquer sur "NUMÉRISER MAINTENANT".

**Résultat attendu :**
- ✅ Ouverture du sélecteur de fichiers.

---

### Test 4 : API Sécurisée
**Commande :**
```bash
# Test de l'API scans
curl -X POST https://artisscan.vercel.app/api/scans \
  -H "Content-Type: application/json" \
  -d '{"invoiceData": {"entreprise": "Test", "montant_ttc": 100}}'
```

**Résultat attendu :**
- ✅ Erreur 401 Unauthorized (car pas de token).

---

### Test 5 : Stripe Checkout (PRO)
**Étapes :**
1. Se connecter.
2. Aller sur `/pricing`
3. Cliquer sur **Mensuel** ou **Annuel** → redirection Stripe Checkout
4. Finaliser le paiement
5. Retour sur `/success` puis redirection `/dashboard`

**Résultat attendu :**
- ✅ Webhook reçu sur `/api/stripe/webhook`
- ✅ `profiles.is_pro = true`
- ✅ `profiles.plan = monthly|yearly`
- ✅ `profiles.stripe_customer_id` et `profiles.stripe_subscription_id` remplis

---

## 🔔 Webhook Stripe (à configurer)

Dans Stripe Dashboard → **Developers → Webhooks** :
- **Endpoint URL** : `https://<ton-domaine>/api/stripe/webhook`
- **Events** :
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Puis copier le **Signing secret** dans `STRIPE_WEBHOOK_SECRET` côté Vercel.

---

## 📊 Monitoring

### Logs Vercel
**URL :** https://vercel.com/giovannis-projects-94f85b0b/artisscan/logs

---

## 🎯 Checklist Post-Déploiement

- [ ] Vérifier que toutes les variables d'environnement sont configurées dans Vercel
- [ ] Tester l'accès Dashboard pour utilisateur non-connecté
- [ ] Tester l'envoi d'emails via Brevo
- [ ] Vérifier les logs Vercel pour détecter des erreurs

---

## 📞 Support

**Problèmes de déploiement ?**
1. Vérifier les logs Vercel
2. Vérifier la console du navigateur
3. Vérifier les logs Supabase (Table Editor > profiles)

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
