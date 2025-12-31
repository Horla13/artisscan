import Link from 'next/link';
import { Camera, FileText, TrendingUp, Download, Sparkles, CheckCircle } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* Barre de navigation */}
      <nav className="w-full border-b border-slate-100 sticky top-0 bg-white z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <Camera className="w-6 h-6 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">ArtisScan</h1>
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

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-100 rounded-full mb-6">
          <Sparkles className="w-4 h-4 text-orange-600" />
          <span className="text-sm font-medium text-orange-700">Propulsé par l'Intelligence Artificielle</span>
        </div>

        <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 max-w-5xl leading-tight">
          ArtisScan : La comptabilité<br />
          <span className="text-orange-600">de chantier en un clic</span>
        </h2>
        
        <p className="text-xl md:text-2xl text-slate-600 mb-8 max-w-3xl leading-relaxed">
          Scannez vos factures, extrayez la TVA automatiquement et exportez tout en CSV pour votre comptable. Simple. Rapide. Professionnel.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-12">
          <Link 
            href="/login"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg px-10 py-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
          >
            Commencer gratuitement
          </Link>
          <button className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-lg px-10 py-4 rounded-xl transition-all duration-200 active:scale-95 border border-slate-200">
            Voir la démo
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
            Une solution complète pour gérer vos factures de chantier en quelques secondes
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
          <Link 
            href="/login"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg px-12 py-5 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
          >
            Commencer maintenant →
          </Link>
          <p className="text-sm text-slate-500 mt-6">
            Sans engagement • Sans carte bancaire • Export illimité
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 text-orange-600" />
              </div>
              <span className="font-semibold text-slate-900">ArtisScan Expert</span>
            </div>
            <p className="text-sm text-slate-500">
              © 2024 ArtisScan. Gestion comptable intelligente pour artisans.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
