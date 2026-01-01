import Link from 'next/link';
import { Camera, FileText, TrendingUp, Download, Sparkles, CheckCircle, Star, Check, Users } from 'lucide-react';

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

        <div className="flex items-center justify-center mb-12">
          <Link 
            href="/login"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg px-10 py-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
          >
            Commencer gratuitement
          </Link>
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
                &quot;Fini les tickets de caisse perdus ! Je scanne tout directement sur le chantier. La catégorisation automatique est géniale.&quot;
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
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-20">
        <div className="text-center mb-16">
          <h3 className="text-4xl font-bold text-slate-900 mb-4">Tarifs simples et transparents</h3>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Choisissez la formule adaptée à votre activité. Sans engagement, résiliable à tout moment.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Plan Gratuit */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200 hover:shadow-lg transition-shadow">
            <h4 className="text-xl font-semibold text-slate-900 mb-2">Gratuit</h4>
            <p className="text-sm text-slate-500 mb-6">Pour découvrir ArtisScan</p>
            
            <div className="mb-6">
              <span className="text-4xl font-bold text-slate-900">0€</span>
              <span className="text-slate-500">/mois</span>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-600">5 scans par mois</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-600">Analyse IA basique</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-600">Calcul TVA automatique</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-600">Historique 30 jours</span>
              </li>
            </ul>

            <Link 
              href="/login"
              className="block w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition-all duration-200 active:scale-95"
            >
              Commencer
            </Link>
          </div>

          {/* Plan Pro (Populaire) */}
          <div className="bg-white rounded-2xl p-8 border-2 border-orange-500 hover:shadow-xl transition-shadow relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-orange-500 text-white text-sm font-semibold px-4 py-1 rounded-full">
                Le plus populaire
              </span>
            </div>
            
            <h4 className="text-xl font-semibold text-slate-900 mb-2">Pro</h4>
            <p className="text-sm text-slate-500 mb-6">Pour les artisans actifs</p>
            
            <div className="mb-6">
              <span className="text-4xl font-bold text-slate-900">19€</span>
              <span className="text-slate-500">/mois</span>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-900 font-medium">Scans illimités</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-900 font-medium">Export CSV illimité</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-900 font-medium">Catégorisation IA automatique</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-900 font-medium">Historique illimité</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-900 font-medium">Graphiques & statistiques</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-900 font-medium">Support prioritaire</span>
              </li>
            </ul>

            <Link 
              href="/login"
              className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-all duration-200 active:scale-95 shadow-sm"
            >
              Essayer gratuitement
            </Link>
            <p className="text-xs text-center text-slate-500 mt-3">14 jours d&apos;essai gratuit</p>
          </div>

          {/* Plan Business */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200 hover:shadow-lg transition-shadow">
            <h4 className="text-xl font-semibold text-slate-900 mb-2">Business</h4>
            <p className="text-sm text-slate-500 mb-6">Pour les équipes</p>
            
            <div className="mb-6">
              <span className="text-4xl font-bold text-slate-900">49€</span>
              <span className="text-slate-500">/mois</span>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-slate-900 mt-0.5 flex-shrink-0" />
                <span className="text-slate-900 font-medium">Tout du plan Pro</span>
              </li>
              <li className="flex items-start gap-3">
                <Users className="w-5 h-5 text-slate-900 mt-0.5 flex-shrink-0" />
                <span className="text-slate-900 font-medium">Jusqu&apos;à 5 utilisateurs</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-slate-900 mt-0.5 flex-shrink-0" />
                <span className="text-slate-900 font-medium">Support prioritaire 24/7</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-slate-900 mt-0.5 flex-shrink-0" />
                <span className="text-slate-900 font-medium">Analyse de rentabilité chantier</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-slate-900 mt-0.5 flex-shrink-0" />
                <span className="text-slate-900 font-medium">API d&apos;intégration</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-slate-900 mt-0.5 flex-shrink-0" />
                <span className="text-slate-900 font-medium">Gestionnaire de compte dédié</span>
              </li>
            </ul>

            <Link 
              href="/login"
              className="block w-full text-center bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-all duration-200 active:scale-95"
            >
              Nous contacter
            </Link>
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
