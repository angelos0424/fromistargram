import type { ReactNode } from 'react';

interface AdminSectionCardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

const AdminSectionCard = ({ title, description, actions, children }: AdminSectionCardProps) => (
  <section className="relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-white/80 via-[#f5f2ff]/70 to-[#e6f7ff]/80 shadow-[0_12px_32px_rgba(126,200,255,0.22),0_4px_14px_rgba(184,164,240,0.2)] backdrop-blur-xl">
    <header className="flex items-start justify-between border-b border-white/60 bg-gradient-to-r from-[#fdfbff]/70 via-[#f0f7ff]/70 to-[#fdf2ff]/70 px-5 py-4">
      <div>
        <h2 className="text-base font-semibold text-slate-700">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
    <div className="px-5 py-4 text-sm text-slate-700">{children}</div>
  </section>
);

export default AdminSectionCard;
