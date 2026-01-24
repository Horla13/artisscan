import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="as-card p-8 text-center border-dashed border-2 border-slate-200 bg-white">
      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-black text-slate-900 mb-2">{title}</h3>
      {description ? <p className="text-sm text-slate-600 mb-6">{description}</p> : null}
      {action ? <div className="flex items-center justify-center">{action}</div> : null}
    </div>
  );
}


