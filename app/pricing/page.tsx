'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SiteFooter } from '@/app/components/SiteFooter';
import { SiteHeader } from '@/app/components/SiteHeader';
import { StatusBadge } from '@/app/components/ui/StatusBadge';

type BillingCycle = 'monthly' | 'yearly';

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<null | BillingCycle>(null);
  const [error, setError] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('monthly');

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
    <div className="min-h-screen bg-[var(--color-surface-2)] text-slate-900">
      <SiteHeader userEmail={userEmail} primaryCta={{ href: '/', label: 'Accueil' }} />

      <main className="as-container as-section">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
            <Sparkles className="w-4 h-4 text-[var(--primary)]" />
            Essai gratuit 14 jours inclus
          </div>
          <h1 className="mt-5 text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Passez en <span className="text-[var(--primary)]">Pro</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Choisissez mensuel ou annuel. Résiliable à tout moment. Paiement sécurisé.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm font-bold text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2">
              <ShieldCheck className="w-4 h-4 text-[var(--primary)]" />
              Sans engagement
            </span>
            <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2">
              <ShieldCheck className="w-4 h-4 text-[var(--primary)]" />
              Paiement Stripe
            </span>
          </div>

          {/* Toggle Mensuel / Annuel */}
          <div className="mt-8 flex items-center justify-center">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setSelectedCycle('monthly')}
                className={`px-4 py-2 rounded-xl text-sm font-black transition ${
                  selectedCycle === 'monthly' ? 'bg-[var(--primary)] text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
                aria-pressed={selectedCycle === 'monthly'}
              >
                Mensuel
              </button>
              <button
                type="button"
                onClick={() => setSelectedCycle('yearly')}
                className={`px-4 py-2 rounded-xl text-sm font-black transition ${
                  selectedCycle === 'yearly' ? 'bg-[var(--primary)] text-white' : 'text-slate-700 hover:bg-slate-50'
                }`}
                aria-pressed={selectedCycle === 'yearly'}
              >
                Annuel
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center">
            <StatusBadge tone="brand" size="md">
              Économie annuelle ~29,80€ (≈ 2 mois offerts)
            </StatusBadge>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => startCheckout(selectedCycle)}
              disabled={loading !== null}
              className="as-btn as-btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Redirection…' : selectedCycle === 'monthly' ? 'Commencer (Mensuel)' : 'Commencer (Annuel)'}
            </button>
            <a href="#details" className="as-btn as-btn-secondary text-center">
              Détails
            </a>
          </div>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 font-bold">
            {error}
          </div>
        )}

        <div id="details" className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className={`as-card p-8 md:p-10 border-2 transition ${selectedCycle === 'monthly' ? 'border-[var(--primary)]' : 'border-slate-200'}`}>
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

            <button onClick={() => startCheckout('monthly')} disabled={loading !== null} className="as-btn as-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed">
              {loading === 'monthly' ? 'Redirection…' : 'Démarrer Pro (Mensuel)'}
            </button>
            <p className="text-xs text-center text-slate-400 mt-3 font-medium">Essai gratuit 14 jours inclus.</p>
          </div>

          <div className={`as-card p-8 md:p-10 border-2 bg-gradient-to-br from-[var(--color-brand-50)] to-white transition ${selectedCycle === 'yearly' ? 'border-[var(--primary)]' : 'border-slate-200'}`}>
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

            <button onClick={() => startCheckout('yearly')} disabled={loading !== null} className="as-btn as-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed">
              {loading === 'yearly' ? 'Redirection…' : 'Démarrer Pro (Annuel)'}
            </button>
            <p className="text-xs text-center text-slate-500 mt-3 font-medium">Essai gratuit 14 jours inclus.</p>
          </div>
        </div>

        <div className="mt-14 text-center text-sm text-slate-500">
          En cliquant, vous serez redirigé vers Stripe Checkout.
        </div>

      </main>

      <SiteFooter />
    </div>
  );
}


