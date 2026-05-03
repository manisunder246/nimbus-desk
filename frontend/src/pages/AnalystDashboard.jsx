import { useMemo, useState } from 'react';
import { useTickets } from '../hooks/useTickets';
import TicketTable from '../components/TicketTable';
import TicketDetailModal from '../components/TicketDetailModal';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import SummaryCard from '../components/SummaryCard';

const ICONS = {
  open:     (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>),
  progress: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  check:    (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>),
};

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

export default function AnalystDashboard() {
  const { items, isLoading, reload } = useTickets();
  const [openId, setOpenId] = useState(null);

  const stats = useMemo(() => {
    const since = Date.now() - ONE_WEEK;
    return {
      open:        items.filter((t) => t.status === 'Open').length,
      progress:    items.filter((t) => t.status === 'In Progress').length,
      resolvedWk:  items.filter((t) => t.status === 'Resolved' && new Date(t.updatedAt || t.createdAt).getTime() >= since).length,
    };
  }, [items]);

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">Tickets assigned to you</h2>
        <p className="text-sm text-slate-500 mt-0.5">Pick one up, work it, close it out.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard label="Open"               value={stats.open}       accent="blue"    icon={ICONS.open} />
        <SummaryCard label="In Progress"        value={stats.progress}   accent="yellow"  icon={ICONS.progress} />
        <SummaryCard label="Resolved this week" value={stats.resolvedWk} accent="emerald" icon={ICONS.check} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-slate-400"><Spinner size={28} /></div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No tickets assigned yet"
          subtitle="When an admin assigns one, it'll show up here."
        />
      ) : (
        <TicketTable tickets={items} onRowClick={(t) => setOpenId(t.ticketId)} showCreatedBy />
      )}

      {openId && (
        <TicketDetailModal
          ticketId={openId}
          onClose={() => setOpenId(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}
