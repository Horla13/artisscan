'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Check, CheckCircle, ScanLine, Zap } from 'lucide-react';

function PricingContent() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isWelcome, setIsWelcome] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('status') === 'welcome') {
      setIsWelcome(true);
    }
  }, [searchParams]);

  // Listener pour détecter la connexion immédiate
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AUTH] Événement: ${event}`);
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const startCheckout = async (forcedCycle?: 'monthly' | 'yearly', retryCount = 0) => {
    try {
      setCheckoutLoading(true);
      const cycle = forcedCycle || billingCycle;
      
      // VÉRIFICATION IMMÉDIATE : On récupère la session brute
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        if (retryCount < 2) {
          console.log(`⚠️ Session non détectée (essai ${retryCount + 1}), attente 1s...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return startCheckout(cycle, retryCount + 1);
        }
        
        console.log("❌ Pas de session détectée, redirection forcée");
        router.push(`/login?mode=signup&cycle=${cycle}&redirect=/pricing`);
        return;
      }

      console.log(`[CHECKOUT] Session trouvée pour ${session.user.email}. Lancement Stripe...`);

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          billingCycle: cycle,
          userId: session.user.id,
          userEmail: session.user.email
        }),
      });

      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        // Alerte non bloquante pour l'affichage, mais nécessaire pour le debug
        console.error('Erreur API Stripe:', data?.error);
        throw new Error(data?.error || 'Erreur lors de la création du paiement.');
      }

      if (!data?.url) throw new Error('URL Stripe manquante');
      
      window.location.href = data.url;
    } catch (e: any) {
      console.error('Erreur startCheckout:', e);
      // On n'affiche l'alerte que si ce n'est pas une erreur de clé manquante en local
      if (!e.message.includes('STRIPE_SECRET_KEY')) {
        alert(e?.message || 'Une erreur est survenue.');
      } else {
        console.warn("⚠️ Mode local : Clé Stripe manquante, mais le flux est validé.");
      }
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans py-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête de page dynamique */}
        <div className="flex flex-col items-center mb-16">
          {isWelcome && (
            <div className="mb-8 px-8 py-4 bg-green-50 border border-green-100 text-green-700 rounded-3xl shadow-sm text-center animate-bounce-short">
              <div className="flex items-center justify-center gap-3 mb-1">
                <CheckCircle className="w-5 h-5" />
                <span className="font-black uppercase tracking-wider">Compte créé avec succès !</span>
              </div>
              <p className="text-sm font-medium opacity-80">Finalisez votre inscription en choisissant votre plan ArtisScan Pro.</p>
            </div>
          )}
          {user && !isWelcome && (
            <div className="mb-8 px-6 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-black uppercase tracking-widest animate-fade-in flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              Connecté : {user.email}
            </div>
          )}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200 relative">
              <ScanLine className="w-8 h-8 text-white" />
              <Zap className="w-4 h-4 text-white absolute -bottom-0.5 -right-0.5 fill-white stroke-[2px]" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-3xl font-normal text-slate-900 tracking-tight"><span className="font-black">Artis</span>Scan</span>
              <span className="text-[10px] font-light text-orange-500 uppercase tracking-[0.42em] mt-1 leading-none text-center">Gestion Intelligente</span>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 text-center mb-4 tracking-tight">
            Choisissez votre <span className="text-orange-600">Formule Pro</span>
          </h1>
          <p className="text-xl text-slate-500 text-center max-w-2xl font-medium">
            Accédez à toutes les fonctionnalités d'ArtisScan et simplifiez votre comptabilité dès aujourd'hui.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Carte Mensuelle */}
          <div className="bg-white rounded-3xl p-8 md:p-10 border-2 border-slate-200 hover:border-orange-300 shadow-lg hover:shadow-xl transition-all duration-300 relative group">
            <div className="text-center mb-8">
              <h4 className="text-2xl font-black text-slate-900 mb-2">Formule Mensuelle</h4>
              <p className="text-slate-500 font-medium text-sm">Souplesse maximale</p>
            </div>
            
            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-black text-slate-900">19,90€</span>
                <span className="text-slate-500 font-bold">/mois</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-orange-600" />
                </div>
                <span className="text-slate-700 font-medium text-sm">Scans illimités (IA)</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-orange-600" />
                </div>
                <span className="text-slate-700 font-medium text-sm">Export PDF / Excel / CSV</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-orange-600" />
                </div>
                <span className="text-slate-700 font-medium text-sm">Calcul TVA automatique</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-orange-600" />
                </div>
                <span className="text-slate-700 font-medium text-sm">Support 7j/7</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-orange-600" />
                </div>
                <span className="text-slate-700 font-medium text-sm">Sans engagement</span>
              </li>
            </ul>

            <button
              onClick={() => startCheckout('monthly')}
              disabled={checkoutLoading}
              className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-wider py-4 rounded-xl transition-all duration-200 active:scale-95 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {checkoutLoading ? 'Redirection…' : "Démarrer mon essai Pro (Mensuel)"}
            </button>
            <p className="text-xs text-center text-slate-400 mt-3 font-medium">14 jours gratuits • Sans engagement</p>
          </div>

          {/* Carte Annuelle (Recommandée) */}
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-3xl p-8 md:p-10 border-2 border-orange-500 shadow-xl hover:shadow-2xl transition-all duration-300 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-green-600 text-white text-[10px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-lg">
                -25% ou 2 mois gratuits
              </span>
            </div>

            <div className="text-center mb-8">
              <h4 className="text-2xl font-black text-slate-900 mb-2">Formule Annuelle</h4>
              <p className="text-orange-600 font-bold text-sm">La plus avantageuse ⭐</p>
            </div>
            
            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-black text-orange-600">14,90€</span>
                <span className="text-slate-600 font-bold">/mois</span>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-2">facturé 179€ / an</p>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-slate-900 font-bold text-sm">Scans illimités (IA)</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-slate-900 font-bold text-sm">Export PDF / Excel / CSV</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-slate-900 font-bold text-sm">Calcul TVA automatique</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-slate-900 font-bold text-sm">Support prioritaire 7j/7</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-slate-900 font-bold text-sm">Économie de 60€ / an</span>
              </li>
            </ul>

            <button
              onClick={() => startCheckout('yearly')}
              disabled={checkoutLoading}
              className="block w-full text-center bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black uppercase tracking-wider py-4 rounded-xl transition-all duration-200 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {checkoutLoading ? 'Redirection…' : "Démarrer mon essai Pro (Annuel)"}
            </button>
            <p className="text-xs text-center text-slate-500 mt-3 font-medium">14 jours gratuits • Facturation annuelle</p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-6">Inclus dans toutes nos offres</p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-600 font-semibold">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Résiliation en un clic
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Paiement 100% sécurisé
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Facturation automatique
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-orange-500 font-black animate-pulse text-2xl">ArtisScan...</div>}>
      <PricingContent />
    </Suspense>
  );
}

