export default function SummaryCard({ label, value, accent = 'indigo', icon }) {
  const accents = {
    indigo:  'text-indigo-600 bg-indigo-50',
    blue:    'text-blue-600 bg-blue-50',
    yellow:  'text-yellow-600 bg-yellow-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    red:     'text-red-600 bg-red-50',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5 flex items-center justify-between">
      <div>
        <div className="text-3xl font-semibold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500 mt-1">{label}</div>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accents[accent]}`}>
        {icon}
      </div>
    </div>
  );
}
