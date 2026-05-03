const STYLES = {
  Admin:   'bg-indigo-100 text-indigo-800 border-indigo-200',
  Analyst: 'bg-violet-100 text-violet-800 border-violet-200',
  User:    'bg-slate-200 text-slate-700 border-slate-300',
};

export default function RoleBadge({ role, className = '' }) {
  const cls = STYLES[role] || STYLES.User;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded border uppercase tracking-wider ${cls} ${className}`}>
      {role || '—'}
    </span>
  );
}
