# 🔒 Système de Sécurité PRO-Only - Dashboard ArtisScan

## Vue d'ensemble

Le Dashboard ArtisScan est maintenant **entièrement sécurisé** pour n'autoriser l'accès qu'aux utilisateurs avec un abonnement PRO actif. Cette protection s'applique à **3 niveaux** :

1. ✅ **Niveau Frontend** : Vérification au chargement du Dashboard
2. ✅ **Niveau UI** : Blocage visuel des boutons de scan
3. ✅ **Niveau API** : Protection des endpoints d'upload

---

## 1️⃣ Niveau Frontend : Vérification au Chargement

### Fichier : `app/dashboard/page.tsx`

#### Hook `useEffect` : `secureAccess()`

Au montage du composant Dashboard, un contrôle strict est effectué :

```typescript
useEffect(() => {
  const secureAccess = async () => {
    setIsLoadingProfile(true);
    
    // 1. Vérifier l'utilisateur connecté
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('🚫 Aucun utilisateur connecté → Redirection /login');
      window.location.href = '/login?redirect=/dashboard';
      return;
    }
    
    // 2. Récupérer le profil dans la table profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    // 3. Vérifier le statut PRO
    if (profile?.plan !== 'pro') {
      console.log('⛔ Plan non-PRO détecté, blocage accès');
      setError('⛔ Abonnement requis pour accéder à cette fonctionnalité');
      setUserTier('free');
      setCanScan(false);
      setIsLoadingProfile(false);
      return;
    }
    
    // 4. Accès autorisé
    console.log('🎉 Plan PRO confirmé → Accès autorisé');
    setUserTier('pro');
    setCanScan(true);
    setRemainingScans(-1);
  };

  secureAccess();
}, []);
```

#### Fonction `checkSubscriptionLimits()`

Cette fonction est appelée après `secureAccess()` et effectue une vérification supplémentaire :

```typescript
const checkSubscriptionLimits = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    router.push('/login');
    return;
  }

  // Récupérer le profil
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_pro, plan, email')
    .eq('id', user.id)
    .single();

  // 🔒 VÉRIFICATION STRICTE : is_pro doit être true
  if (!profile?.is_pro) {
    console.warn('⛔ ACCÈS REFUSÉ: Utilisateur non-PRO détecté');
    setError('⛔ Abonnement requis pour accéder à cette fonctionnalité');
    
    // Redirection forcée vers /pricing après 1,5s
    setTimeout(() => {
      router.push('/pricing');
    }, 1500);
    return;
  }

  // ✅ Utilisateur PRO confirmé
  setUserTier('pro');
  setCanScan(true);
};
```

#### Écran "Accès Restreint"

Si l'utilisateur n'est pas PRO, un écran élégant est affiché :

```typescript
if (error && error.includes('Abonnement requis')) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-slate-50 flex items-center justify-center">
      <div className="bg-white shadow-2xl rounded-3xl p-8 max-w-lg w-full text-center">
        {/* Icône Crown + AlertCircle */}
        <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-50 rounded-full">
          <Crown className="w-10 h-10 text-orange-500" />
        </div>
        
        <h2 className="text-2xl font-black text-slate-900">
          🔒 Accès Restreint
        </h2>
        <p className="text-slate-500 text-sm">
          Abonnement PRO requis
        </p>
        
        {/* Liste des avantages PRO */}
        <ul className="text-sm text-slate-600">
          <li>✓ Scans IA illimités</li>
          <li>✓ Exports PDF, Excel, CSV</li>
          <li>✓ Organisation par dossiers</li>
          <li>✓ Envoi direct au comptable</li>
        </ul>
        
        {/* Badge 14 jours d'essai */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
          <p className="text-2xl font-black">14 jours d'essai gratuit</p>
        </div>
        
        {/* Bouton CTA */}
        <button onClick={() => router.push('/pricing')}>
          <Crown className="w-5 h-5" />
          Devenir PRO maintenant
        </button>
      </div>
    </div>
  );
}
```

**Caractéristiques :**
- ✅ Design moderne avec gradient
- ✅ Message clair et professionnel
- ✅ Liste des avantages PRO
- ✅ Offre 14 jours d'essai mise en avant
- ✅ Bouton de rafraîchissement si déjà abonné
- ✅ Redirection automatique vers `/pricing` après 1,5s

---

## 2️⃣ Niveau UI : Blocage des Boutons de Scan

### Fonction `triggerFileInput()`

Cette fonction est appelée quand l'utilisateur clique sur un bouton de scan :

```typescript
const triggerFileInput = () => {
  // 🔒 VÉRIFICATION PRO : Bloquer l'accès si non-PRO
  if (userTier !== 'pro') {
    showToastMessage('⛔ Abonnement PRO requis pour scanner des factures', 'error');
    setTimeout(() => {
      router.push('/pricing');
    }, 1500);
    return;
  }
  
  // Si PRO, ouvrir le menu de sélection
  setShowUploadMenu(true);
};
```

### Bouton "NUMÉRISER MAINTENANT" (Dashboard)

```typescript
<button
  onClick={triggerFileInput}
  disabled={analyzing || userTier !== 'pro'}
  className={`btn-primary w-full max-w-xs mx-auto py-4 px-6 rounded-2xl 
    disabled:opacity-50 disabled:cursor-not-allowed 
    ${userTier !== 'pro' ? 'relative overflow-hidden' : ''}`}
  title={userTier !== 'pro' ? 'Abonnement PRO requis' : 'Scanner une facture'}
>
  {/* Overlay de verrouillage si non-PRO */}
  {userTier !== 'pro' && (
    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-10">
      <Crown className="w-6 h-6 text-white animate-pulse" />
    </div>
  )}
  
  <Camera className="w-6 h-6" />
  NUMÉRISER MAINTENANT
</button>
```

**Effets visuels si non-PRO :**
- ✅ Bouton `disabled`
- ✅ Opacity 50%
- ✅ Curseur `not-allowed`
- ✅ Overlay noir avec icône Crown animée
- ✅ Tooltip explicatif

### Bouton Central de Navigation (Mobile)

```typescript
<button
  onClick={triggerFileInput}
  disabled={analyzing || userTier !== 'pro'}
  className={`flex flex-col items-center justify-center -mt-10 
    bg-orange-500 text-white rounded-3xl p-5 shadow-2xl 
    disabled:opacity-50 disabled:cursor-not-allowed 
    ${userTier !== 'pro' ? 'saturate-50' : ''}`}
  title={userTier !== 'pro' ? 'Abonnement PRO requis' : 'Scanner une facture'}
>
  {/* Badge de verrouillage si non-PRO */}
  {userTier !== 'pro' && (
    <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-900 rounded-full border-2 border-white shadow-lg">
      <Crown className="w-4 h-4 text-orange-400 animate-pulse" />
    </div>
  )}
  
  <Camera className="w-8 h-8" />
</button>
```

**Effets visuels si non-PRO :**
- ✅ Bouton `disabled`
- ✅ Saturation 50% (couleur terne)
- ✅ Badge Crown animé en haut à droite
- ✅ Tooltip explicatif

---

## 3️⃣ Niveau API : Protection de `/api/scans`

### Fichier : `app/api/scans/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 1. Vérifier l'authentification JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ 
        error: 'Non authentifié',
        message: 'Vous devez être connecté pour uploader des factures'
      }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Non authentifié',
        message: 'Session invalide ou expirée'
      }, { status: 401 });
    }

    // 2. Récupérer le profil utilisateur
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_pro, plan, email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ 
        error: 'Erreur de vérification',
        message: 'Impossible de vérifier votre statut d\'abonnement'
      }, { status: 500 });
    }

    // 🔒 BLOCAGE STRICT : is_pro doit être true
    if (!profile.is_pro) {
      console.warn('⛔ ACCÈS REFUSÉ: Utilisateur non-PRO tente d\'uploader');
      console.warn('   Email:', profile.email);
      console.warn('   is_pro:', profile.is_pro);
      console.warn('   plan:', profile.plan);
      
      return NextResponse.json({ 
        error: 'Abonnement requis',
        message: '⛔ Abonnement requis pour accéder à cette fonctionnalité',
        isPro: false,
        redirectTo: '/pricing'
      }, { status: 403 });
    }

    // 3. Autoriser l'upload (utilisateur PRO)
    console.log('✅ Upload autorisé pour utilisateur PRO:', profile.email);
    
    const { invoiceData } = await req.json();
    
    const { data: invoice, error: insertError } = await supabaseAdmin
      .from('scans')
      .insert([{
        ...invoiceData,
        user_id: user.id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ 
        error: 'Erreur d\'enregistrement',
        message: insertError.message
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      invoice,
      message: 'Facture enregistrée avec succès'
    }, { status: 201 });

  } catch (err: any) {
    return NextResponse.json({ 
      error: 'Erreur serveur',
      message: err.message || 'Une erreur est survenue'
    }, { status: 500 });
  }
}

// Bloquer les autres méthodes HTTP
export async function GET() {
  return NextResponse.json({ 
    error: 'Méthode non autorisée',
    message: 'Utilisez POST pour uploader une facture'
  }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ 
    error: 'Méthode non autorisée',
    message: 'Utilisez POST pour uploader une facture'
  }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ 
    error: 'Méthode non autorisée',
    message: 'Cette action n\'est pas autorisée'
  }, { status: 405 });
}
```

**Protection API complète :**
- ✅ Vérification du token JWT (`Authorization: Bearer <token>`)
- ✅ Récupération du profil avec `SERVICE_ROLE_KEY` (bypass RLS)
- ✅ Vérification stricte `is_pro === true`
- ✅ Retour `403 Forbidden` si non-PRO
- ✅ Logs détaillés pour monitoring
- ✅ Blocage méthodes GET/PUT/DELETE

---

## 🎯 Scénarios d'Utilisation

### Scénario 1 : Utilisateur Non-Connecté

**Comportement :**
1. Accède à `/dashboard`
2. `secureAccess()` détecte aucun utilisateur
3. ➡️ Redirection immédiate vers `/login?redirect=/dashboard`

**Résultat :** ❌ Accès bloqué dès le chargement

---

### Scénario 2 : Utilisateur Connecté mais Non-PRO

**Comportement :**
1. Accède à `/dashboard`
2. `secureAccess()` récupère `profile.is_pro = false`
3. ➡️ Affichage de l'écran "Accès Restreint"
4. ➡️ Redirection automatique vers `/pricing` après 1,5s

**Résultat :** ❌ Écran explicatif + redirection forcée

---

### Scénario 3 : Utilisateur Non-PRO Tente de Scanner

**Comportement :**
1. Clique sur le bouton "NUMÉRISER MAINTENANT"
2. `triggerFileInput()` détecte `userTier !== 'pro'`
3. ➡️ Toast "⛔ Abonnement PRO requis"
4. ➡️ Redirection vers `/pricing` après 1,5s

**Résultat :** ❌ Toast d'erreur + redirection

---

### Scénario 4 : Tentative de Bypass API (requête directe)

**Comportement :**
1. Utilisateur envoie `POST /api/scans` via cURL ou Postman
2. API vérifie le token JWT
3. Récupère `profile.is_pro = false`
4. ➡️ Retour `403 Forbidden`

**Résultat :** ❌ Accès API bloqué côté serveur

---

### Scénario 5 : Utilisateur PRO (Cas Normal)

**Comportement :**
1. Accède à `/dashboard`
2. `secureAccess()` récupère `profile.is_pro = true`
3. ✅ Dashboard s'affiche normalement
4. Clique sur "NUMÉRISER MAINTENANT"
5. ✅ Menu de sélection s'ouvre (Photo / Fichier)
6. Upload → API vérifie `is_pro = true`
7. ✅ Facture enregistrée

**Résultat :** ✅ Accès total et fonctionnel

---

## 📊 Récapitulatif des Protections

| Niveau | Méthode | Condition Bloquante | Action si Bloqué |
|--------|---------|---------------------|------------------|
| **Frontend** | `useEffect` → `secureAccess()` | `profile?.plan !== 'pro'` | Écran "Accès Restreint" + redirection `/pricing` |
| **Frontend** | `checkSubscriptionLimits()` | `!profile?.is_pro` | Redirection `/pricing` après 1,5s |
| **UI** | `triggerFileInput()` | `userTier !== 'pro'` | Toast erreur + redirection `/pricing` |
| **UI** | Bouton scan (disabled) | `userTier !== 'pro'` | Bouton grisé + overlay Crown |
| **API** | `POST /api/scans` | `!profile.is_pro` | Retour `403 Forbidden` |
| **API** | GET/PUT/DELETE `/api/scans` | Toujours | Retour `405 Method Not Allowed` |

---

## ✅ Tests de Validation

### Test 1 : Build Next.js

```bash
npm run build
```

**Résultat :** ✅ Compilation réussie, 0 erreurs TypeScript

---

### Test 2 : Affichage Écran "Accès Restreint"

**Étapes :**
1. Créer un utilisateur test avec `is_pro = false` dans Supabase
2. Se connecter avec ce compte
3. Accéder à `/dashboard`

**Résultat attendu :**
- ✅ Écran "🔒 Accès Restreint" affiché
- ✅ Liste des avantages PRO visible
- ✅ Badge "14 jours d'essai gratuit"
- ✅ Redirection automatique vers `/pricing` après 1,5s

---

### Test 3 : Blocage Bouton Scan

**Étapes :**
1. Avec un compte non-PRO, accéder (temporairement) au Dashboard
2. Observer les boutons de scan

**Résultat attendu :**
- ✅ Bouton `disabled` (opacity 50%)
- ✅ Overlay Crown animé
- ✅ Tooltip "Abonnement PRO requis"
- ✅ Clic → Toast d'erreur + redirection `/pricing`

---

### Test 4 : Protection API

**Étapes :**
1. Récupérer le token JWT d'un utilisateur non-PRO
2. Envoyer une requête POST à `/api/scans`

**Commande :**
```bash
curl -X POST https://artisscan.vercel.app/api/scans \
  -H "Authorization: Bearer <token-non-pro>" \
  -H "Content-Type: application/json" \
  -d '{"invoiceData": {...}}'
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

## 🔐 Variables d'Environnement Requises

Pour que la sécurité fonctionne correctement, ces variables doivent être configurées :

```env
# Supabase (obligatoire)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (pour paiements)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_PRICE_ID_MONTHLY=price_xxx
STRIPE_PRICE_ID_YEARLY=price_xxx
```

---

## 📋 Structure de la Table `profiles` (Supabase)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  company_name TEXT,
  
  -- 🔒 CHAMPS DE SÉCURITÉ
  is_pro BOOLEAN DEFAULT FALSE,  -- ✅ Utilisé pour blocage strict
  plan TEXT DEFAULT 'free',      -- 'pro' ou 'free'
  
  -- Stripe (optionnel)
  stripe_customer_id TEXT,
  subscription_status TEXT,      -- 'active', 'trialing', 'canceled'
  subscription_tier TEXT,        -- 'pro', 'free'
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Webhook Stripe** met à jour `is_pro` et `plan` après un paiement réussi.

---

## 🚀 Déploiement

### Variables à Configurer sur Vercel

1. Aller dans **Settings > Environment Variables**
2. Ajouter toutes les variables d'environnement listées ci-dessus
3. Redéployer l'application

### Webhook Stripe à Configurer

1. Aller dans **Stripe Dashboard > Developers > Webhooks**
2. Ajouter un endpoint : `https://artisscan.vercel.app/api/stripe-webhook`
3. Sélectionner l'événement : `checkout.session.completed`
4. Copier le `Signing Secret` dans `STRIPE_WEBHOOK_SECRET`

---

## 📝 Notes de Maintenance

### Pour Accorder l'Accès PRO à un Utilisateur

**Option 1 : Via Supabase Dashboard**
```sql
UPDATE profiles
SET is_pro = TRUE, plan = 'pro', updated_at = NOW()
WHERE email = 'utilisateur@example.com';
```

**Option 2 : Via Stripe**
L'utilisateur effectue un paiement → le webhook met automatiquement `is_pro = TRUE`.

---

### Pour Déboguer les Problèmes d'Accès

1. **Vérifier le profil dans Supabase :**
   ```sql
   SELECT id, email, is_pro, plan, stripe_customer_id 
   FROM profiles 
   WHERE email = 'utilisateur@example.com';
   ```

2. **Vérifier les logs Vercel :**
   - Rechercher `⛔ ACCÈS REFUSÉ` dans les logs serveur
   - Vérifier les valeurs de `is_pro` et `plan`

3. **Forcer un rafraîchissement de session :**
   - L'utilisateur clique sur "Rafraîchissez la page" dans l'écran d'accès restreint
   - Ou appelle `supabase.auth.refreshSession()` manuellement

---

## 🎉 Résumé Final

Le système de sécurité ArtisScan est maintenant **robuste et multi-couche** :

- ✅ **3 niveaux de protection** (Frontend, UI, API)
- ✅ **Écran "Accès Restreint"** élégant et informatif
- ✅ **Boutons de scan bloqués visuellement** pour les non-PRO
- ✅ **API sécurisée** avec vérification `is_pro === true`
- ✅ **Logs détaillés** pour monitoring et débogage
- ✅ **Messages utilisateur clairs** avec redirections intelligentes
- ✅ **Tests validés** (build réussi, 0 erreurs)

**Résultat :** Seuls les utilisateurs avec un abonnement PRO actif peuvent accéder au Dashboard et scanner des factures. Les autres sont guidés vers la page `/pricing` avec des messages clairs et professionnels.

---

**Date de création :** 4 janvier 2026  
**Version :** 1.0  
**Auteur :** Assistant IA - ArtisScan Security Team

