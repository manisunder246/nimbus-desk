const STYLES = {
  'Open':         'bg-blue-100 text-blue-800',
  'In Progress':  'bg-yellow-100 text-yellow-800',
  'Resolved':     'bg-emerald-100 text-emerald-800',
  'Closed':       'bg-slate-200 text-slate-700',
};

export default function StatusPill({ value }) {
  const cls = STYLES[value] || 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${cls}`}>
      {value || '—'}
    </span>
  );
}
