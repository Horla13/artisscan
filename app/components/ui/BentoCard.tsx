import type { ReactNode } from 'react';

export type BentoCardProps = {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function BentoCard({ title, subtitle, icon, right, children, className }: BentoCardProps) {
  return (
    <div className={['as-card as-card-hover p-8 bg-white', className || ''].join(' ')}>
      {(title || subtitle || icon || right) ? (
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            {title ? (
              <div className="flex items-center gap-2">
                {icon ? <span className="text-[var(--primary)]">{icon}</span> : null}
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{title}</h3>
              </div>
            ) : null}
            {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          </div>
          {right ? <div className="flex-shrink-0">{right}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}


