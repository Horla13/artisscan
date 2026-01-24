'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Camera, TrendingUp, Download, CheckCircle, Star, Check, ArrowRight, Sparkles, ShieldCheck, Clock3 } from 'lucide-react';
import { SiteHeader } from '@/app/components/SiteHeader';
import { SiteFooter } from '@/app/components/SiteFooter';

export default function Home() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const monthlyPrice = 14.9;
  const yearlyPrice = 149;
  const annualSaving = (monthlyPrice * 12) - yearlyPrice;

  useEffect(() => {
    // Vérifier la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email || null);
    });

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const startSignup = (cycle?: 'monthly' | 'yearly') => {
    const c = cycle || 'monthly';
    window.location.href = `/login?mode=signup&cycle=${c}&redirect=/pricing`;
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface-2)] text-slate-900">
      <SiteHeader
        userEmail={userEmail}
        navItems={[
          { href: '#accueil', label: 'Accueil' },
          { href: '#fonctionnalites', label: 'Fonctionnalités' },
          { href: '#comment', label: 'Comment ça marche' },
          { href: '#tarifs', label: 'Tarifs' },
          { href: '#temoignages', label: 'Témoignages' },
        ]}
        primaryCta={{ href: '/login?mode=signup&redirect=/pricing', label: 'Essai gratuit' }}
      />

      {/* Section Hero */}
      <section id="accueil" className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(2,6,23,0.18) 1px, transparent 0)', backgroundSize: '28px 28px' }} />
          <div className="absolute -top-24 left-1/4 h-96 w-96 rounded-full blur-3xl opacity-20 bg-[var(--primary)]" />
          <div className="absolute -bottom-24 right-1/4 h-96 w-96 rounded-full blur-3xl opacity-20 bg-[var(--primary)]" />
        </div>

        <div className="as-container as-section">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                <Sparkles className="w-4 h-4 text-[var(--primary)]" />
                V1 — Essai gratuit 14 jours
              </div>

              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.05]">
                La comptabilité des artisans,
                <span className="block text-[var(--primary)]">sans paperasse.</span>
              </h1>

              <p className="mt-5 text-lg sm:text-xl text-slate-600 leading-relaxed">
                Scannez vos factures, récupérez vos informations clés et exportez en CSV/PDF/Excel.
                Simple, rapide, pensé pour le terrain.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button onClick={() => startSignup()} className="as-btn as-btn-primary w-full sm:w-auto">
                  Commencer maintenant
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a href="#tarifs" className="as-btn as-btn-secondary w-full sm:w-auto text-center">
                  Voir les tarifs
                </a>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-slate-600">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <ShieldCheck className="w-4 h-4 text-[var(--primary)]" />
                  <span className="font-bold">Sans engagement</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <Clock3 className="w-4 h-4 text-[var(--primary)]" />
                  <span className="font-bold">Gain de temps</span>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-bold">Exports prêts</span>
                </div>
              </div>
            </div>

            {/* Right illustration (UI preview) */}
            <div className="relative">
              <div className="as-card as-card-hover p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">Aperçu</div>
                    <div className="mt-1 text-lg font-black text-slate-900">Facture scannée</div>
                  </div>
                  <div className="rounded-xl bg-[var(--color-brand-50)] p-3">
                    <Camera className="w-5 h-5 text-[var(--primary)]" />
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">Fournisseur</div>
                    <div className="mt-1 font-bold text-slate-900">Matériaux Pro</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">Catégorie</div>
                    <div className="mt-1 font-bold text-slate-900">Matériaux</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">HT</div>
                    <div className="mt-1 font-black text-slate-900">120,00€</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">TTC</div>
                    <div className="mt-1 font-black text-slate-900">144,00€</div>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full w-[72%] bg-[var(--primary)]" />
                  </div>
                  <span className="text-xs font-black text-slate-500">Analyse IA</span>
                </div>
              </div>
              <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-[var(--color-brand-100)] to-transparent blur-2xl opacity-70" />
            </div>
          </div>
        </div>
      </section>

      {/* Section Fonctionnalités */}
      <section id="fonctionnalites" className="as-section">
        <div className="as-container">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Fonctionnalités</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Une solution complète pour gérer vos factures par dossier ou catégorie en quelques secondes
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* Fonctionnalité 1 - Scan IA */}
          <div className="as-card as-card-hover p-7">
            <div className="w-12 h-12 bg-[var(--color-brand-50)] rounded-2xl flex items-center justify-center mb-5">
              <Camera className="w-6 h-6 text-[var(--primary)]" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Scan intelligent</h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              Prenez une photo ou sélectionnez depuis votre galerie. Notre IA analyse et extrait toutes les données en quelques secondes.
            </p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full"></div>
                Reconnaissance automatique
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full"></div>
                8 catégories intelligentes
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full"></div>
                Compression optimisée
              </li>
            </ul>
          </div>

          {/* Fonctionnalité 2 - TVA */}
          <div className="as-card as-card-hover p-7">
            <div className="w-12 h-12 bg-[var(--color-brand-50)] rounded-2xl flex items-center justify-center mb-5">
              <TrendingUp className="w-6 h-6 text-[var(--primary)]" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Montants & TVA</h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              Visualisez instantanément votre TVA récupérable. Stats en temps réel et graphiques des 7 derniers jours.
            </p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full"></div>
                Total HT du mois
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full"></div>
                TVA récupérable
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full"></div>
                Graphiques visuels
              </li>
            </ul>
          </div>

          {/* Fonctionnalité 3 - Export */}
          <div className="as-card as-card-hover p-7">
            <div className="w-12 h-12 bg-[var(--color-brand-50)] rounded-2xl flex items-center justify-center mb-5">
              <Download className="w-6 h-6 text-[var(--primary)]" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Exports comptables</h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              Générez un fichier CSV professionnel compatible avec tous les logiciels comptables. Prêt à envoyer.
            </p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full"></div>
                Format universel CSV
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full"></div>
                Tri par date/montant
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full"></div>
                Export instantané
              </li>
            </ul>
          </div>
        </div>
        </div>
      </section>

      {/* Section Témoignages */}
      <section id="temoignages" className="as-section">
        <div className="as-container">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Témoignages</h2>
            <p className="text-lg text-slate-600">Des artisans qui gagnent du temps chaque semaine.</p>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 md:gap-6 md:overflow-visible">
            {/* Témoignage 1 */}
            <div className="as-card as-card-hover p-7 min-w-[280px] snap-start">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-[var(--primary)] text-[var(--primary)]" />
                ))}
              </div>
              <p className="text-slate-700 leading-relaxed mb-6">
                &quot;Je passe de 2h à 10 minutes pour ma compta mensuelle. L&apos;export CSV est parfait pour mon comptable, plus aucune saisie manuelle !&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[var(--color-brand-50)] rounded-2xl flex items-center justify-center">
                  <span className="text-[var(--primary)] font-black text-lg">JE</span>
                </div>
                <div>
                  <p className="font-black text-slate-900">Jean E.</p>
                  <p className="text-sm text-slate-500">Plombier, Paris</p>
                </div>
              </div>
            </div>

            {/* Témoignage 2 */}
            <div className="as-card as-card-hover p-7 min-w-[280px] snap-start">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-[var(--primary)] text-[var(--primary)]" />
                ))}
              </div>
              <p className="text-slate-700 leading-relaxed mb-6">
                &quot;Fini les tickets de caisse perdus ! Je scanne tout directement sur place. La catégorisation automatique est géniale.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[var(--color-brand-50)] rounded-2xl flex items-center justify-center">
                  <span className="text-[var(--primary)] font-black text-lg">ML</span>
                </div>
                <div>
                  <p className="font-black text-slate-900">Marc L.</p>
                  <p className="text-sm text-slate-500">Électricien, Lyon</p>
                </div>
              </div>
            </div>

            {/* Témoignage 3 */}
            <div className="as-card as-card-hover p-7 min-w-[280px] snap-start">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-[var(--primary)] text-[var(--primary)]" />
                ))}
              </div>
              <p className="text-slate-700 leading-relaxed mb-6">
                &quot;Une vraie révolution pour ma micro-entreprise. Simple, efficace et mon comptable adore recevoir mes factures déjà triées !&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[var(--color-brand-50)] rounded-2xl flex items-center justify-center">
                  <span className="text-[var(--primary)] font-black text-lg">SD</span>
                </div>
                <div>
                  <p className="font-black text-slate-900">Sophie D.</p>
                  <p className="text-sm text-slate-500">Peintre, Marseille</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Tarification */}
      <section id="tarifs" className="as-section">
        <div className="as-container">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Tarifs</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Choisissez la formule qui vous convient. Sans engagement, résiliable à tout moment.
          </p>
        </div>

        {/* ✅ Toggle mensuel / annuel (cohérence premium avec l’app) */}
        <div className="mt-8 flex items-center justify-center">
          <div className="inline-flex rounded-[var(--radius-control)] bg-slate-100 p-1 shadow-inner">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={[
                'px-5 py-2 text-sm font-black rounded-[var(--radius-control)] transition-all',
                billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={[
                'px-5 py-2 text-sm font-black rounded-[var(--radius-control)] transition-all',
                billingCycle === 'yearly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              Annuel <span className="ml-2 text-[var(--primary)] font-black">(-{Math.round(annualSaving)}€)</span>
            </button>
          </div>
        </div>

        <div className="mt-10 grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Mensuel */}
          <div className={[
            'as-card as-card-hover p-8 md:p-10 border-2 flex flex-col',
            billingCycle === 'monthly' ? 'border-[var(--primary)] bg-gradient-to-br from-[var(--color-brand-50)] to-white' : 'border-slate-200 bg-white',
          ].join(' ')}>
            <div className="text-center mb-8">
              <h4 className="text-2xl font-black text-slate-900 mb-2">Mensuel</h4>
              <p className="text-slate-500 font-medium text-sm">Souplesse maximale</p>
            </div>
            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-black text-slate-900">{monthlyPrice.toFixed(2).replace('.', ',')}€</span>
                <span className="text-slate-500 font-bold">/mois</span>
              </div>
            </div>
            <ul className="space-y-4 mb-8 flex-grow">
              {['Scans illimités (IA)', 'Export PDF / Excel / CSV', 'Calcul TVA automatique', 'Support 7j/7', 'Sans engagement'].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-[var(--color-brand-50)] rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-[var(--primary)]" />
                  </div>
                  <span className="text-slate-700 font-medium text-sm">{t}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => startSignup('monthly')} className="as-btn as-btn-primary w-full">
              Commencer l&apos;essai de 14 jours
            </button>
          </div>

          {/* Annuel */}
          <div className={[
            'as-card as-card-hover p-8 md:p-10 border-2 flex flex-col relative overflow-visible',
            billingCycle === 'yearly' ? 'border-[var(--primary)] bg-gradient-to-br from-[var(--color-brand-50)] to-white' : 'border-slate-200 bg-white',
          ].join(' ')}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="bg-[var(--primary)] text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">
                Meilleure offre • -{Math.round(annualSaving)}€
              </span>
            </div>
            <div className="text-center mb-8">
              <h4 className="text-2xl font-black text-slate-900 mb-2">Annuel</h4>
              <p className="text-[var(--primary)] font-bold text-sm">Le plus avantageux</p>
            </div>
            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-black text-[var(--primary)]">{yearlyPrice}€</span>
                <span className="text-slate-600 font-bold">/an</span>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-2">facturé {yearlyPrice}€ / an</p>
            </div>
            <ul className="space-y-4 mb-8 flex-grow">
              {['Scans illimités (IA)', 'Export PDF / Excel / CSV', 'Calcul TVA automatique', 'Support prioritaire 7j/7', `Économie de ~${Math.round(annualSaving)}€ / an`].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-[var(--primary)] rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-slate-900 font-bold text-sm">{t}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => startSignup('yearly')} className="as-btn as-btn-primary w-full">
              Commencer l&apos;essai de 14 jours
            </button>
          </div>
        </div>

        {/* FAQ Tarifs */}
        <div className="mt-16 text-center">
          <p className="text-slate-600 mb-4 font-medium">
            Des questions sur nos tarifs ?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Résiliation à tout moment
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Paiement sécurisé
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Facture automatique chaque mois
            </span>
          </div>
        </div>
      </div>
      </section>

      {/* Section Comment ça marche */}
      <section id="comment" className="as-section border-t border-slate-200/70">
        <div className="as-container">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Comment ça marche</h2>
            <p className="text-lg text-slate-600">3 étapes, zéro friction.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: 1, title: 'Photographiez', desc: 'Prenez une photo depuis votre téléphone ou importez un fichier.', icon: <Camera className="w-5 h-5 text-[var(--primary)]" /> },
              { n: 2, title: 'L’IA extrait', desc: 'L’entreprise, les montants et la catégorie sont pré-remplis.', icon: <Sparkles className="w-5 h-5 text-[var(--primary)]" /> },
              { n: 3, title: 'Exportez', desc: 'CSV/Excel/PDF prêts pour votre comptable.', icon: <Download className="w-5 h-5 text-[var(--primary)]" /> },
            ].map((s) => (
              <div key={s.n} className="as-card as-card-hover p-7">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--color-brand-50)] flex items-center justify-center">
                    {s.icon}
                  </div>
                  <div className="text-xs font-black text-slate-400">Étape {s.n}</div>
                </div>
                <div className="mt-4 text-lg font-black text-slate-900">{s.title}</div>
                <p className="mt-2 text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section CTA Final */}
      <section className="as-section">
        <div className="as-container">
          <div className="as-card p-10 sm:p-14 text-center bg-gradient-to-br from-white to-[var(--color-brand-50)] border-2 border-[var(--color-brand-100)]">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
            Prêt à simplifier votre comptabilité ?
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Rejoignez les artisans qui ont déjà divisé leur temps de paperasse par 10
          </p>
          <button
            onClick={() => startSignup()}
            className="as-btn as-btn-primary px-10 py-4 text-base"
          >
            Commencer maintenant →
          </button>
          <p className="text-sm text-slate-500 mt-6">
            Sans engagement • Export illimité
          </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
