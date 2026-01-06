import type { ReactNode } from 'react';

interface AdminSectionCardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

const AdminSectionCard = ({ title, description, actions, children }: AdminSectionCardProps) => (
  <section className="rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg shadow-slate-900/40">
    <header className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
      <div>
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
    <div className="px-5 py-4 text-sm text-slate-200">{children}</div>
  </section>
);

export default AdminSectionCard;
