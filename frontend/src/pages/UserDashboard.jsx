import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../hooks/useTickets';
import TicketTable from '../components/TicketTable';
import TicketDetailModal from '../components/TicketDetailModal';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';

export default function UserDashboard() {
  const nav = useNavigate();
  const { items, isLoading, reload } = useTickets();
  const [openId, setOpenId] = useState(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">My Tickets</h2>
          <p className="text-sm text-slate-500 mt-0.5">Tickets you've raised, with their current status.</p>
        </div>
        <button
          onClick={() => nav('/app/tickets/new')}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Raise Ticket
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-slate-400"><Spinner size={28} /></div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No tickets yet"
          subtitle="Click 'Raise Ticket' to log your first incident."
        />
      ) : (
        <TicketTable tickets={items} onRowClick={(t) => setOpenId(t.ticketId)} />
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
