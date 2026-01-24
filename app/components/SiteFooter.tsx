import Link from 'next/link';
import { ScanLine, Zap } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/70 bg-white">
      <div className="as-container py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center relative bg-[var(--primary)]">
              <ScanLine className="w-5 h-5 text-white" />
              <Zap className="w-3 h-3 text-white absolute -bottom-0.5 -right-0.5 fill-white stroke-[2px]" />
            </div>
            <div className="leading-tight">
              <div className="font-black text-slate-900">ArtisScan</div>
              <div className="text-xs font-bold text-slate-500">Gestion comptable pour artisans</div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-bold text-slate-500">
            <Link href="/legal/mentions-legales" className="hover:text-[var(--primary)] transition-colors">Mentions légales</Link>
            <span className="text-slate-300">•</span>
            <Link href="/legal/cgu" className="hover:text-[var(--primary)] transition-colors">CGU</Link>
            <span className="text-slate-300">•</span>
            <Link href="/legal/confidentialite" className="hover:text-[var(--primary)] transition-colors">Confidentialité</Link>
            <span className="text-slate-300">•</span>
            <Link href="/legal/cookies" className="hover:text-[var(--primary)] transition-colors">Cookies</Link>
            <span className="text-slate-300">•</span>
            <Link href="/legal/remboursement" className="hover:text-[var(--primary)] transition-colors">Remboursement</Link>
          </nav>
        </div>

        <div className="mt-8 text-center text-xs text-slate-500">
          © 2026 ArtisScan. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}


