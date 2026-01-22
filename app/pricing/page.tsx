'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ScanLine, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type BillingCycle = 'monthly' | 'yearly';

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<null | BillingCycle>(null);
  const [error, setError] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserEmail(session?.user?.email || null);
    };
    run();
  }, []);

  const startCheckout = async (billingCycle: BillingCycle) => {
    setError('');
    setLoading(billingCycle);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        router.push('/login?redirect=/pricing');
        return;
      }

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ billingCycle }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Impossible de démarrer le paiement');
      }
      if (!data?.url) throw new Error('URL Stripe manquante');
      window.location.href = data.url;
    } catch (e: any) {
      setError(e?.message || 'Erreur paiement');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center mb-14">
          <Link href="/" className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200 relative">
              <ScanLine className="w-8 h-8 text-white" />
              <Zap className="w-4 h-4 text-white absolute -bottom-0.5 -right-0.5 fill-white stroke-[2px]" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-3xl font-normal text-slate-900 tracking-tight"><span className="font-black">Artis</span>Scan</span>
              <span className="text-[10px] font-light text-orange-500 uppercase tracking-[0.42em] mt-1 leading-none text-center">Gestion Intelligente</span>
            </div>
          </Link>

          {userEmail && (
            <div className="mb-6 px-6 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-black uppercase tracking-widest animate-fade-in flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              Connecté : {userEmail}
            </div>
          )}

          <h1 className="text-4xl md:text-5xl font-black text-slate-900 text-center mb-4 tracking-tight">
            Passez en <span className="text-orange-600">Pro</span>
          </h1>
          <p className="text-lg text-slate-500 text-center max-w-2xl font-medium">
            Essai gratuit 14 jours, puis abonnement mensuel ou annuel.
          </p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 font-semibold">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="bg-white rounded-3xl p-8 md:p-10 border-2 border-slate-200 shadow-lg">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 mb-2">Mensuel</h2>
              <p className="text-slate-500 font-medium text-sm">Souplesse maximale</p>
            </div>

            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-black text-slate-900">14,90€</span>
                <span className="text-slate-500 font-bold">/mois</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {['Scans IA illimités', 'Exports CSV / Excel / PDF', 'Dossiers & envoi comptable'].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-orange-600" />
                  </div>
                  <span className="text-slate-700 font-medium text-sm">{t}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => startCheckout('monthly')}
              disabled={loading !== null}
              className="block w-full text-center bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:text-slate-600 text-white font-black uppercase tracking-wider py-4 rounded-xl transition-all duration-200 text-sm"
            >
              {loading === 'monthly' ? 'Redirection…' : 'Démarrer Pro (Mensuel)'}
            </button>
            <p className="text-xs text-center text-slate-400 mt-3 font-medium">Essai gratuit 14 jours inclus.</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-white rounded-3xl p-8 md:p-10 border-2 border-orange-500 shadow-xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 mb-2">Annuel</h2>
              <p className="text-orange-600 font-bold text-sm">Meilleure offre</p>
            </div>

            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-black text-orange-600">149€</span>
                <span className="text-slate-600 font-bold">/an</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {['Scans IA illimités', 'Exports CSV / Excel / PDF', 'Dossiers & envoi comptable'].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-slate-900 font-bold text-sm">{t}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => startCheckout('yearly')}
              disabled={loading !== null}
              className="block w-full text-center bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:text-slate-600 text-white font-black uppercase tracking-wider py-4 rounded-xl transition-all duration-200 text-sm"
            >
              {loading === 'yearly' ? 'Redirection…' : 'Démarrer Pro (Annuel)'}
            </button>
            <p className="text-xs text-center text-slate-500 mt-3 font-medium">Essai gratuit 14 jours inclus.</p>
          </div>
        </div>

        <div className="mt-14 text-center text-sm text-slate-500">
          En cliquant, vous serez redirigé vers Stripe Checkout.
        </div>
      </div>
    </div>
  );
}


