import type { ReactNode } from 'react';

type Tone = 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'processing';
type Size = 'sm' | 'md';

export type StatusBadgeProps = {
  tone?: Tone;
  size?: Size;
  pulse?: boolean;
  icon?: ReactNode;
  children: ReactNode;
};

function toneClasses(tone: Tone): string {
  switch (tone) {
    case 'brand':
      return 'bg-[var(--color-brand-50)] text-[var(--primary)] border-[var(--color-brand-100)]';
    case 'success':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'warning':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'danger':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'processing':
      return 'bg-[var(--color-brand-50)] text-[var(--primary)] border-[var(--color-brand-100)]';
    case 'neutral':
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

function sizeClasses(size: Size): string {
  return size === 'md'
    ? 'px-3 py-1 text-xs rounded-xl'
    : 'px-2.5 py-1 text-[10px] rounded-lg';
}

export function StatusBadge({
  tone = 'neutral',
  size = 'sm',
  pulse = false,
  icon,
  children,
}: StatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 border font-black uppercase tracking-wider',
        toneClasses(tone),
        sizeClasses(size),
        pulse ? 'animate-pulse' : '',
      ].join(' ')}
    >
      {icon ? <span className="inline-flex">{icon}</span> : null}
      {children}
    </span>
  );
}
