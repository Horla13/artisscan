import Link from 'next/link';
import { ArrowLeft, ScanLine, Zap } from 'lucide-react';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
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
              <span className="hidden sm:inline">Retour à l'accueil</span>
              <span className="sm:hidden">Retour</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
          <article className="prose prose-slate max-w-none p-6 sm:p-12">
            {children}
          </article>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white mt-8 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center relative">
                <ScanLine className="w-5 h-5 text-white" />
                <Zap className="w-3 h-3 text-white absolute -bottom-0.5 -right-0.5 fill-white stroke-[2px]" />
              </div>
              <span className="font-semibold text-slate-900"><span className="font-black">Artis</span>Scan</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-slate-500">
              <Link href="/legal/mentions-legales" className="hover:text-orange-500 transition-colors">
                Mentions légales
              </Link>
              <span className="hidden sm:inline">•</span>
              <Link href="/legal/cgu" className="hover:text-orange-500 transition-colors">
                CGU
              </Link>
              <span className="hidden sm:inline">•</span>
              <Link href="/legal/confidentialite" className="hover:text-orange-500 transition-colors">
                Confidentialité
              </Link>
              <span className="hidden sm:inline">•</span>
              <Link href="/legal/cookies" className="hover:text-orange-500 transition-colors">
                Cookies
              </Link>
              <span className="hidden sm:inline">•</span>
              <Link href="/legal/remboursement" className="hover:text-orange-500 transition-colors">
                Remboursement
              </Link>
              <span className="hidden sm:inline">•</span>
              <Link href="/legal/facturation" className="hover:text-orange-500 transition-colors">
                Facturation
              </Link>
              <span className="hidden sm:inline">•</span>
              <span>© 2024 ArtisScan</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

