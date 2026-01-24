'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { LayoutDashboard, LogIn, Menu, ScanLine, X, Zap } from 'lucide-react';

type NavItem = { href: string; label: string };

export type SiteHeaderProps = {
  userEmail?: string | null;
  /** Optional in-page anchors (home) */
  navItems?: NavItem[];
  /** Primary CTA shown on the right */
  primaryCta?: { href: string; label: string };
};

export function SiteHeader(props: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const navItems = useMemo(() => props.navItems || [], [props.navItems]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="as-container h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm relative bg-[var(--primary)]">
            <ScanLine className="w-6 h-6 text-white" />
            <Zap className="w-3.5 h-3.5 text-white absolute -bottom-0.5 -right-0.5 fill-white stroke-[2px]" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-lg sm:text-xl tracking-tight text-slate-900">
              <span className="font-black">Artis</span>Scan
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.34em] text-[var(--primary)] mt-1">
              Gestion intelligente
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        {navItems.length > 0 && (
          <nav className="hidden lg:flex items-center gap-6 text-sm font-bold text-slate-600">
            {navItems.map((i) => (
              <a
                key={i.href}
                href={i.href}
                className="hover:text-slate-900 transition-colors"
              >
                {i.label}
              </a>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          {props.userEmail ? (
            <>
              <span className="hidden md:inline-flex max-w-[240px] truncate rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                {props.userEmail}
              </span>
              <Link href="/dashboard" className="as-btn as-btn-primary">
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/login?redirect=/dashboard" className="hidden sm:inline-flex as-btn as-btn-secondary">
                <LogIn className="w-4 h-4" />
                Connexion
              </Link>
              {props.primaryCta ? (
                <Link href={props.primaryCta.href} className="as-btn as-btn-primary">
                  {props.primaryCta.label}
                </Link>
              ) : null}
            </>
          )}

          {/* Mobile menu button */}
          {navItems.length > 0 && (
            <button
              type="button"
              className="lg:hidden inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 transition"
              aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile panel */}
      {open && navItems.length > 0 && (
        <div className="lg:hidden border-t border-slate-200 bg-white">
          <div className="as-container py-3 flex flex-col gap-1">
            {navItems.map((i) => (
              <a
                key={i.href}
                href={i.href}
                className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                {i.label}
              </a>
            ))}
            {!props.userEmail && (
              <Link
                href="/login?redirect=/dashboard"
                className="mt-2 as-btn as-btn-secondary w-full"
                onClick={() => setOpen(false)}
              >
                <LogIn className="w-4 h-4" />
                Connexion
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}


