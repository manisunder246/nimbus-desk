export default function EmptyState({ title = 'Nothing here yet', subtitle, action }) {
  return (
    <div className="bg-white border border-dashed border-slate-300 rounded-lg p-12 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
          <path d="M9 12h6"/><path d="M12 9v6"/>
          <rect x="3" y="3" width="18" height="18" rx="2"/>
        </svg>
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
