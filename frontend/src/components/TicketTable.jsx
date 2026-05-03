import PriorityBadge from './PriorityBadge';
import StatusPill from './StatusPill';

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function TicketTable({ tickets, onRowClick, showCreatedBy, showActions }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
            <th className="px-4 py-3">Ticket</th>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Status</th>
            {showCreatedBy && <th className="px-4 py-3">Created by</th>}
            <th className="px-4 py-3">Created</th>
            {showActions && <th className="px-4 py-3 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {tickets.map((t) => (
            <tr
              key={t.ticketId}
              onClick={() => onRowClick?.(t)}
              className="hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 font-mono text-xs text-slate-500">#{t.ticketId.slice(0,8)}</td>
              <td className="px-4 py-3 text-sm text-slate-900 font-medium max-w-xs truncate">{t.title}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{t.category}</td>
              <td className="px-4 py-3"><PriorityBadge value={t.priority} /></td>
              <td className="px-4 py-3"><StatusPill value={t.status} /></td>
              {showCreatedBy && <td className="px-4 py-3 text-sm text-slate-600">{t.createdByEmail}</td>}
              <td className="px-4 py-3 text-sm text-slate-500">{timeAgo(t.createdAt)}</td>
              {showActions && (
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); onRowClick?.(t); }}
                    className="text-xs px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    Open
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
