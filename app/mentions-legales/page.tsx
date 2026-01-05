'use client';

import Link from 'next/link';
import { ArrowLeft, ScanLine, Zap } from 'lucide-react';

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center relative group-hover:scale-105 transition-transform">
                <ScanLine className="w-6 h-6 text-white" />
                <Zap className="w-3 h-3 text-white absolute -bottom-0.5 -right-0.5 fill-white stroke-[2px]" />
              </div>
              <span className="text-xl font-semibold text-slate-900">
                <span className="font-black">Artis</span>Scan
              </span>
            </Link>
            
            <Link 
              href="/" 
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-orange-500 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-black text-slate-900 mb-8">Mentions Légales</h1>
          
          <div className="space-y-8 text-slate-600">
            {/* Éditeur */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Éditeur du site</h2>
              <p className="mb-2"><strong>Nom de l'entreprise :</strong> ArtisScan</p>
              <p className="mb-2"><strong>Forme juridique :</strong> [À compléter]</p>
              <p className="mb-2"><strong>Adresse du siège social :</strong> [À compléter]</p>
              <p className="mb-2"><strong>Email :</strong> contact@artisscan.fr</p>
              <p className="mb-2"><strong>SIRET :</strong> [À compléter]</p>
              <p className="mb-2"><strong>TVA intracommunautaire :</strong> [À compléter]</p>
            </section>

            {/* Directeur de publication */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Directeur de la publication</h2>
              <p>[Nom du directeur de publication]</p>
            </section>

            {/* Hébergement */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Hébergement</h2>
              <p className="mb-2"><strong>Hébergeur :</strong> Vercel Inc.</p>
              <p className="mb-2"><strong>Adresse :</strong> 340 S Lemon Ave #4133, Walnut, CA 91789, USA</p>
              <p className="mb-2"><strong>Site web :</strong> <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">vercel.com</a></p>
            </section>

            {/* Propriété intellectuelle */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Propriété intellectuelle</h2>
              <p className="mb-4">
                L'ensemble de ce site relève de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle. 
                Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.
              </p>
              <p>
                La reproduction de tout ou partie de ce site sur un support électronique ou autre quel qu'il soit est formellement interdite 
                sauf autorisation expresse du directeur de la publication.
              </p>
            </section>

            {/* Données personnelles */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Protection des données personnelles</h2>
              <p className="mb-4">
                Conformément à la loi « Informatique et Libertés » du 6 janvier 1978 modifiée et au Règlement Général sur la Protection des Données (RGPD), 
                vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition aux données personnelles vous concernant.
              </p>
              <p className="mb-4">
                Pour exercer ce droit, vous pouvez nous contacter à l'adresse suivante : <strong>contact@artisscan.fr</strong>
              </p>
              <p>
                Les données collectées via ce site sont utilisées uniquement dans le cadre de l'utilisation du service ArtisScan et ne sont jamais transmises à des tiers.
              </p>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Cookies</h2>
              <p className="mb-4">
                Ce site utilise des cookies techniques nécessaires au bon fonctionnement de l'application, notamment pour :
              </p>
              <ul className="list-disc list-inside space-y-2 mb-4">
                <li>La gestion de l'authentification</li>
                <li>La sauvegarde de vos préférences</li>
                <li>L'analyse anonyme du trafic</li>
              </ul>
              <p>
                Vous pouvez configurer votre navigateur pour refuser les cookies, mais certaines fonctionnalités du site pourraient ne plus être disponibles.
              </p>
            </section>

            {/* Limitation de responsabilité */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Limitation de responsabilité</h2>
              <p className="mb-4">
                ArtisScan met tout en œuvre pour offrir aux utilisateurs des informations et des outils disponibles et vérifiés, 
                mais ne saurait être tenu responsable des erreurs, d'une absence de disponibilité des informations et/ou de la présence de virus sur son site.
              </p>
              <p>
                Les liens hypertextes mis en place dans le cadre du présent site web en direction d'autres sites et/ou de pages personnelles 
                et d'une manière générale vers toutes ressources existantes sur Internet, ne sauraient engager la responsabilité d'ArtisScan.
              </p>
            </section>

            {/* Crédits */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Crédits</h2>
              <p className="mb-2"><strong>Conception et développement :</strong> ArtisScan</p>
              <p className="mb-2"><strong>Technologies utilisées :</strong> Next.js, React, Tailwind CSS, Supabase, Stripe</p>
              <p className="mb-2"><strong>Icônes :</strong> Lucide Icons</p>
            </section>
          </div>

          {/* Date de mise à jour */}
          <div className="mt-12 pt-8 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              <strong>Dernière mise à jour :</strong> Janvier 2026
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white mt-16">
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

