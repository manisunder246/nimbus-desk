const STATUSES   = ['Open', 'In Progress', 'Resolved', 'Closed'];
const PRIORITIES = ['High', 'Medium', 'Low'];

const selectCls =
  'text-sm border border-slate-300 rounded-md px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function FilterBar({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v || undefined });
  const isActive = value.status || value.priority;

  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Filter</span>
      <select className={selectCls} value={value.status || ''} onChange={(e) => set('status', e.target.value)}>
        <option value="">All statuses</option>
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <select className={selectCls} value={value.priority || ''} onChange={(e) => set('priority', e.target.value)}>
        <option value="">All priorities</option>
        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      {isActive && (
        <button
          onClick={() => onChange({})}
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
