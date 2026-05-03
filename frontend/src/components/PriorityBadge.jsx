const STYLES = {
  High:   'bg-red-100 text-red-800 border border-red-200',
  Medium: 'bg-amber-100 text-amber-800 border border-amber-200',
  Low:    'bg-emerald-100 text-emerald-800 border border-emerald-200',
};

export default function PriorityBadge({ value }) {
  const cls = STYLES[value] || 'bg-slate-100 text-slate-700 border border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${cls}`}>
      {value || '—'}
    </span>
  );
}
