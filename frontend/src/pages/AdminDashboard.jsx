import { useMemo, useState } from 'react';
import { useTickets } from '../hooks/useTickets';
import TicketTable from '../components/TicketTable';
import TicketDetailModal from '../components/TicketDetailModal';
import SummaryCard from '../components/SummaryCard';
import FilterBar from '../components/FilterBar';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';

const ICONS = {
  open:     (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>),
  progress: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  check:    (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>),
  alert:    (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
};

export default function AdminDashboard() {
  const [filters, setFilters] = useState({});
  const [openId, setOpenId] = useState(null);
  const all = useTickets({});           // unfiltered for summary stats
  const filtered = useTickets(filters); // filtered for table

  const stats = useMemo(() => {
    const items = all.items || [];
    return {
      open:     items.filter((t) => t.status === 'Open').length,
      progress: items.filter((t) => t.status === 'In Progress').length,
      resolved: items.filter((t) => t.status === 'Resolved').length,
      high:     items.filter((t) => t.priority === 'High' && t.status !== 'Closed').length,
    };
  }, [all.items]);

  const reloadAll = () => { all.reload(); filtered.reload(); };

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">All tickets</h2>
        <p className="text-sm text-slate-500 mt-0.5">Triage, assign and resolve incidents from here.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total Open"     value={stats.open}     accent="blue"    icon={ICONS.open} />
        <SummaryCard label="In Progress"    value={stats.progress} accent="yellow"  icon={ICONS.progress} />
        <SummaryCard label="Resolved"       value={stats.resolved} accent="emerald" icon={ICONS.check} />
        <SummaryCard label="High Priority"  value={stats.high}     accent="red"     icon={ICONS.alert} />
      </div>

      <FilterBar value={filters} onChange={setFilters} />

      {filtered.isLoading ? (
        <div className="flex justify-center py-16 text-slate-400"><Spinner size={28} /></div>
      ) : filtered.items.length === 0 ? (
        <EmptyState title="No tickets match these filters" subtitle="Try clearing filters to see everything." />
      ) : (
        <TicketTable
          tickets={filtered.items}
          onRowClick={(t) => setOpenId(t.ticketId)}
          showCreatedBy
          showActions
        />
      )}

      {openId && (
        <TicketDetailModal
          ticketId={openId}
          onClose={() => setOpenId(null)}
          onChanged={reloadAll}
        />
      )}
    </div>
  );
}
