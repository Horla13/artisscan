import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  illustration?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, description, icon, illustration, action }: EmptyStateProps) {
  return (
    <div className="as-card p-8 text-center border-dashed border-2 border-slate-200 bg-white relative overflow-hidden">
      {illustration ? (
        <div className="pointer-events-none absolute inset-0 opacity-[0.10]">
          {illustration}
        </div>
      ) : null}
      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 relative">
        {icon}
      </div>
      <h3 className="text-lg font-black text-slate-900 mb-2">{title}</h3>
      {description ? <p className="text-sm text-slate-600 mb-6">{description}</p> : null}
      {action ? <div className="flex items-center justify-center">{action}</div> : null}
    </div>
  );
}


