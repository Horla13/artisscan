'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Camera, FileText, TrendingUp, Download, Sparkles, CheckCircle, Star, Check, ScanLine, Zap } from 'lucide-react';

export default function Home() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const startCheckout = async () => {
    try {
      setCheckoutLoading(true);
      
      // Récupérer l'utilisateur actuel s'il est déjà connecté
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          billingCycle,
          userId: session?.user?.id 
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Erreur paiement');
      }
      if (!data?.url) {
        throw new Error('URL Stripe manquante');
      }
      window.location.href = data.url;
    } catch (e: any) {
      alert(e?.message || 'Erreur lors du paiement.');
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Barre de navigation */}
      <nav className="w-full border-b border-slate-100 sticky top-0 bg-white z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-200 relative">
              <ScanLine className="w-6 h-6 text-white" />
              <Zap className="w-3.5 h-3.5 text-white absolute -bottom-0.5 -right-0.5 fill-white stroke-[2px]" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-2xl font-normal text-slate-900 tracking-tight"><span className="font-black">Artis</span>Scan</span>
              <span className="text-[8px] font-light text-orange-500 uppercase tracking-[0.42em] mt-1 leading-none">Gestion Intelligente</span>
            </div>
          </div>
          <Link 
            href="/login"
            className="text-slate-700 hover:text-slate-900 font-medium px-4 py-2 transition-colors duration-200"
          >
            Connexion
          </Link>
        </div>
      </nav>

      {/* Section Hero */}
      <section className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center relative overflow-hidden">
        {/* Fond décoratif subtil */}
        <div className="absolute inset-0 -z-10 opacity-5">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-orange-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-orange-500 rounded-full blur-3xl"></div>
        </div>

        <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 max-w-5xl leading-tight">
          ArtisScan : La comptabilité<br />
          <span className="text-orange-600">des artisans en un clic</span>
        </h2>
        
        <p className="text-xl md:text-2xl text-slate-600 mb-8 max-w-3xl leading-relaxed">
          Scannez vos factures, extrayez la TVA automatiquement et exportez en PDF / Excel / CSV. Une app universelle pour tous les artisans : bâtiment, boulangerie, food-trucks, ateliers, services.
        </p>

        <div className="flex items-center justify-center mb-12">
          <button
            onClick={startCheckout}
            disabled={checkoutLoading}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg px-10 py-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {checkoutLoading ? 'Redirection…' : 'Commencer maintenant'}
          </button>
        </div>

        {/* Badges de confiance */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Sans engagement</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Export CSV inclus</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>TVA calculée automatiquement</span>
          </div>
        </div>
      </section>

      {/* Section Fonctionnalités */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-20 border-t border-slate-100">
        <div className="text-center mb-16">
          <h3 className="text-4xl font-bold text-slate-900 mb-4">Tout ce dont vous avez besoin</h3>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Une solution complète pour gérer vos factures par dossier ou catégorie en quelques secondes
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Fonctionnalité 1 - Scan IA */}
          <div className="card-clean rounded-2xl p-8 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center mb-6">
              <Camera className="w-7 h-7 text-orange-600" />
            </div>
            <h4 className="text-xl font-semibold text-slate-900 mb-3">Scan Intelligent</h4>
            <p className="text-slate-600 leading-relaxed mb-4">
              Prenez une photo ou sélectionnez depuis votre galerie. Notre IA analyse et extrait toutes les données en quelques secondes.
            </p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                Reconnaissance automatique
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                8 catégories intelligentes
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                Compression optimisée
              </li>
            </ul>
          </div>

          {/* Fonctionnalité 2 - TVA */}
          <div className="card-clean rounded-2xl p-8 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center mb-6">
              <TrendingUp className="w-7 h-7 text-orange-600" />
            </div>
            <h4 className="text-xl font-semibold text-slate-900 mb-3">Calcul TVA Automatique</h4>
            <p className="text-slate-600 leading-relaxed mb-4">
              Visualisez instantanément votre TVA récupérable. Stats en temps réel et graphiques des 7 derniers jours.
            </p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                Total HT du mois
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                TVA récupérable
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                Graphiques visuels
              </li>
            </ul>
          </div>

          {/* Fonctionnalité 3 - Export */}
          <div className="card-clean rounded-2xl p-8 hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center mb-6">
              <Download className="w-7 h-7 text-orange-600" />
            </div>
            <h4 className="text-xl font-semibold text-slate-900 mb-3">Export Comptable</h4>
            <p className="text-slate-600 leading-relaxed mb-4">
              Générez un fichier CSV professionnel compatible avec tous les logiciels comptables. Prêt à envoyer.
            </p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                Format universel CSV
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                Tri par date/montant
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                Export instantané
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section Témoignages */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-20">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-slate-900 mb-4">Ce que disent nos artisans</h3>
            <p className="text-lg text-slate-600">Des milliers d&apos;artisans nous font confiance au quotidien</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Témoignage 1 */}
            <div className="bg-white rounded-2xl p-8 border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-orange-500 text-orange-500" />
                ))}
              </div>
              <p className="text-slate-700 leading-relaxed mb-6">
                &quot;Je passe de 2h à 10 minutes pour ma compta mensuelle. L&apos;export CSV est parfait pour mon comptable, plus aucune saisie manuelle !&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-lg">JE</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Jean E.</p>
                  <p className="text-sm text-slate-500">Plombier, Paris</p>
                </div>
              </div>
            </div>

            {/* Témoignage 2 */}
            <div className="bg-white rounded-2xl p-8 border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-orange-500 text-orange-500" />
                ))}
              </div>
              <p className="text-slate-700 leading-relaxed mb-6">
                &quot;Fini les tickets de caisse perdus ! Je scanne tout directement sur place. La catégorisation automatique est géniale.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-lg">ML</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Marc L.</p>
                  <p className="text-sm text-slate-500">Électricien, Lyon</p>
                </div>
              </div>
            </div>

            {/* Témoignage 3 */}
            <div className="bg-white rounded-2xl p-8 border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-orange-500 text-orange-500" />
                ))}
              </div>
              <p className="text-slate-700 leading-relaxed mb-6">
                &quot;Une vraie révolution pour ma micro-entreprise. Simple, efficace et mon comptable adore recevoir mes factures déjà triées !&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-lg">SD</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Sophie D.</p>
                  <p className="text-sm text-slate-500">Peintre, Marseille</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Tarification */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-20" id="tarification">
        <div className="text-center mb-12">
          <h3 className="text-4xl font-bold text-slate-900 mb-4">Un tarif simple pour tous</h3>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10">
            Une seule offre complète. Sans engagement, résiliable à tout moment.
          </p>

          {/* Sélecteur Mois/Année */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-400'}`}>Mensuel</span>
            <button 
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative w-14 h-7 bg-slate-200 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${billingCycle === 'yearly' ? 'translate-x-7' : ''}`} />
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${billingCycle === 'yearly' ? 'text-slate-900' : 'text-slate-400'}`}>Annuel</span>
              <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-sm">
                -25% ou 2 mois gratuits
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center">
          {/* Plan Unique : ArtisScan Pro */}
          <div className="bg-white rounded-3xl p-8 md:p-12 border-2 border-orange-500 shadow-xl shadow-orange-100 relative max-w-lg w-full">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-orange-500 text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 py-1.5 rounded-full shadow-lg">
                OFFRE ILLIMITÉE
              </span>
            </div>
            
            <div className="text-center mb-10">
              <h4 className="text-2xl font-black text-slate-900 mb-2">ArtisScan Pro</h4>
              <p className="text-slate-500 font-medium">Pour tous les artisans et commerçants</p>
            </div>
            
            <div className="text-center mb-10">
              <div className="flex items-center justify-center gap-1">
                <span className="text-5xl font-black text-slate-900">
                  {billingCycle === 'monthly' ? '19,90' : '14,90'}€
                </span>
                <div className="text-left">
                  <p className="text-slate-500 font-bold leading-none">/mois</p>
                  {billingCycle === 'yearly' && (
                    <p className="text-[10px] text-green-600 font-black uppercase tracking-tighter mt-1">Facturé 179€/an</p>
                  )}
                </div>
              </div>
            </div>

            <ul className="space-y-5 mb-10">
              <li className="flex items-center gap-4">
                <div className="w-6 h-6 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0 border border-orange-100">
                  <Check className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-slate-900 font-bold">Scans illimités (IA Haute Précision)</span>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-6 h-6 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0 border border-orange-100">
                  <Check className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-slate-900 font-bold">Export PDF / Excel / CSV illimité</span>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-6 h-6 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0 border border-orange-100">
                  <Check className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-slate-900 font-bold">Calcul TVA & Catégorisation auto</span>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-6 h-6 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0 border border-orange-100">
                  <Check className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-slate-900 font-bold">Gestion des dossiers & archives</span>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-6 h-6 bg-orange-50 rounded-full flex items-center justify-center flex-shrink-0 border border-orange-100">
                  <Check className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-slate-900 font-bold">Support prioritaire 7j/7</span>
              </li>
            </ul>

            <button
              onClick={startCheckout}
              disabled={checkoutLoading}
              className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-[0.1em] py-5 rounded-2xl transition-all duration-200 active:scale-95 shadow-lg shadow-orange-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {checkoutLoading ? 'Redirection…' : "Démarrer l'essai gratuit"}
            </button>
            <p className="text-xs text-center text-slate-400 mt-4 font-bold uppercase tracking-widest italic">14 jours d'essai gratuit • Sans engagement</p>
          </div>
        </div>

        {/* FAQ Tarifs */}
        <div className="mt-16 text-center">
          <p className="text-slate-600 mb-4">
            Des questions sur nos tarifs ?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Résiliation à tout moment
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Paiement sécurisé
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Facturation mensuelle ou annuelle
            </span>
          </div>
        </div>
      </section>

      {/* Section Comment ça marche */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-20 border-t border-slate-100">
        <div className="text-center mb-16">
          <h3 className="text-4xl font-bold text-slate-900 mb-4">Comment ça marche ?</h3>
          <p className="text-lg text-slate-600">Trois étapes pour une comptabilité sans effort</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-12">
          {/* Étape 1 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange-500 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mb-6 shadow-sm">
              1
            </div>
            <h4 className="text-2xl font-semibold text-slate-900 mb-4">📸 Photographiez</h4>
            <p className="text-slate-600 leading-relaxed">
              Prenez une photo de votre facture directement depuis votre smartphone ou sélectionnez depuis votre galerie.
            </p>
          </div>

          {/* Étape 2 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange-500 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mb-6 shadow-sm">
              2
            </div>
            <h4 className="text-2xl font-semibold text-slate-900 mb-4">🤖 Laissez l&apos;IA analyser</h4>
            <p className="text-slate-600 leading-relaxed">
              Notre intelligence artificielle extrait automatiquement l&apos;entreprise, les montants HT/TTC, la TVA et classe par catégorie.
            </p>
          </div>

          {/* Étape 3 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange-500 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mb-6 shadow-sm">
              3
            </div>
            <h4 className="text-2xl font-semibold text-slate-900 mb-4">💾 Exportez en CSV</h4>
            <p className="text-slate-600 leading-relaxed">
              Téléchargez toutes vos factures au format CSV et envoyez directement à votre comptable. Compatible avec tous les logiciels.
            </p>
          </div>
        </div>
      </section>

      {/* Section CTA Final */}
      <section className="bg-slate-50 border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h3 className="text-4xl font-bold text-slate-900 mb-6">
            Prêt à simplifier votre comptabilité ?
          </h3>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            Rejoignez les artisans qui ont déjà divisé leur temps de paperasse par 10
          </p>
          <button
            onClick={startCheckout}
            disabled={checkoutLoading}
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg px-12 py-5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {checkoutLoading ? 'Redirection…' : 'Commencer maintenant →'}
          </button>
          <p className="text-sm text-slate-500 mt-6">
            Sans engagement • Export illimité
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center relative">
              <ScanLine className="w-5 h-5 text-white" />
              <Zap className="w-3 h-3 text-white absolute -bottom-0.5 -right-0.5 fill-white stroke-[2px]" />
            </div>
            <span className="font-semibold text-slate-900"><span className="font-black">Artis</span>Scan</span>
          </div>
          <p className="text-sm text-slate-500">
            © 2024 ArtisScan. Gestion Intelligente universelle pour artisans.
          </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
