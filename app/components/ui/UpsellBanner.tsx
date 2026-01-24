import Link from 'next/link';
import type { ReactNode } from 'react';
import { Crown } from 'lucide-react';

type UpsellBannerProps = {
  title?: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
  icon?: ReactNode;
};

export function UpsellBanner({
  title = 'Passez à Pro',
  description = 'Débloquez le scan IA, les exports et les fonctionnalités Premium.',
  ctaHref = '/pricing',
  ctaLabel = 'Voir les tarifs',
  icon,
}: UpsellBannerProps) {
  return (
    <div className="as-card border-2 border-[var(--color-brand-100)] bg-gradient-to-br from-white to-[var(--color-brand-50)] p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--primary)] text-white flex items-center justify-center flex-shrink-0">
            {icon || <Crown className="w-5 h-5" />}
          </div>
          <div>
            <div className="font-black text-slate-900">{title}</div>
            <div className="text-sm text-slate-600">{description}</div>
          </div>
        </div>

        <Link href={ctaHref} className="as-btn as-btn-primary w-full sm:w-auto text-center">
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}


