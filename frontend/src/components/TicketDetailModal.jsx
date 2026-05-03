// components/TicketDetailModal.jsx — slide-over drawer.
// Controls displayed adapt to role:
//   Admin   -> Assign + Status (full PATCH)
//   Analyst -> Status only (PATCH gated server-side too)
//   User    -> read-only
// assignedTo is stored as the Cognito sub; the modal resolves it to a
// display name via the cached useUsers list so the activity log shows
// "Priya Sharma" rather than a UUID.
import { useEffect, useMemo, useState } from 'react';
import PriorityBadge from './PriorityBadge';
import StatusPill from './StatusPill';
import RoleBadge from './RoleBadge';
import Spinner from './Spinner';
import { getTicket, updateTicket, closeTicket } from '../services/api';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

const STATUS_OPTS = ['Open', 'In Progress', 'Resolved', 'Closed'];
// Sort order for the assign-to dropdown — Analysts surface first
const ROLE_RANK = { Analyst: 0, User: 1, Admin: 2 };

export default function TicketDetailModal({ ticketId, onClose, onChanged }) {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin   = role === 'Admin';
  const isAnalyst = role === 'Analyst';
  const toast = useToast();
  const { users } = useUsers();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ status: '', assignedTo: '' });

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9)),
    [users],
  );
  const userById    = useMemo(() => new Map(users.map((u) => [u.userId, u])), [users]);
  const userByEmail = useMemo(() => new Map(users.map((u) => [u.email,  u])), [users]);
  const lookupAssigned = (idOrEmail) =>
    idOrEmail && (userById.get(idOrEmail) || userByEmail.get(idOrEmail)) || null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTicket(ticketId)
      .then((t) => { if (!cancelled) { setTicket(t); setDraft({ status: t.status, assignedTo: t.assignedTo || '' }); } })
      .catch(() => toast.error('Failed to load ticket'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ticketId]);

  const dirty =
    ticket && (
      draft.status !== ticket.status ||
      (draft.assignedTo || null) !== (ticket.assignedTo || null)
    );

  async function save() {
    if (!ticket) return;
    setSaving(true);
    try {
      const patch = {};
      if (isAdmin) {
        if (draft.status !== ticket.status) patch.status = draft.status;
        if ((draft.assignedTo || null) !== (ticket.assignedTo || null)) patch.assignedTo = draft.assignedTo || null;
      } else if (isAnalyst) {
        if (draft.status !== ticket.status) patch.status = draft.status;
      }
      if (Object.keys(patch).length === 0) return setSaving(false);
      const updated = await updateTicket(ticket.ticketId, patch);
      setTicket({ ...ticket, ...updated });
      toast.success('Ticket updated');
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function doClose() {
    if (!ticket) return;
    setSaving(true);
    try {
      const updated = await closeTicket(ticket.ticketId);
      setTicket({ ...ticket, ...updated });
      setDraft({ status: 'Closed', assignedTo: updated.assignedTo || '' });
      toast.success('Ticket closed');
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Close failed');
    } finally {
      setSaving(false);
    }
  }

  const assignee = lookupAssigned(ticket?.assignedTo);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-slate-900/30" onClick={onClose} />
      <div className="w-[480px] bg-white h-full overflow-y-auto shadow-2xl animate-slide-in-right">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="font-mono text-xs text-slate-500">Ticket #{ticketId.slice(0,8)}</div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {loading || !ticket ? (
          <div className="p-12 flex justify-center text-slate-400"><Spinner size={28} /></div>
        ) : (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{ticket.title}</h2>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                <PriorityBadge value={ticket.priority} />
                <StatusPill value={ticket.status} />
                <span>· {ticket.category}</span>
                <span>· {new Date(ticket.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">Created by</div>
                <div className="text-slate-900">
                  {lookupAssigned(ticket.createdBy)?.name || ticket.createdByEmail}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">Assigned to</div>
                <div className="text-slate-900 inline-flex items-center gap-2">
                  {assignee
                    ? <>{assignee.name} <RoleBadge role={assignee.role} /></>
                    : ticket.assignedTo
                      ? <span className="text-slate-700">{ticket.assignedTo}</span>
                      : <span className="text-slate-400">Unassigned</span>}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Description</div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>

            {ticket.attachmentUrl && (
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Attachment</div>
                <a href={ticket.attachmentUrl} target="_blank" rel="noreferrer"
                   className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download attachment
                </a>
              </div>
            )}

            {(isAdmin || isAnalyst) && (
              <div className="border-t border-slate-200 pt-5 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {isAdmin ? 'Admin actions' : 'Analyst actions'}
                </div>

                {isAdmin && (
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Assign to</label>
                    <select
                      value={draft.assignedTo}
                      onChange={(e) => setDraft({ ...draft, assignedTo: e.target.value })}
                      className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white"
                    >
                      <option value="">Unassigned</option>
                      {sortedUsers.map((u) => (
                        <option key={u.userId} value={u.userId}>
                          {u.name} — {u.role}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Update status</label>
                  <select
                    value={draft.status}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                    className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white"
                  >
                    {STATUS_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={save}
                    disabled={!dirty || saving}
                    className="px-4 py-2 text-sm rounded-md bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {saving && <Spinner size={14} />} {isAnalyst ? 'Save status' : 'Save changes'}
                  </button>
                  {ticket.status !== 'Closed' && (
                    <button
                      onClick={doClose}
                      disabled={saving}
                      className="px-4 py-2 text-sm rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                    >
                      Close ticket
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 pt-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Activity</div>
              <ol className="relative border-l border-slate-200 ml-2 pl-5 space-y-4">
                {[...(ticket.activityLog || [])].reverse().map((a, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[27px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white"></span>
                    <div className="text-sm text-slate-900">{a.action}</div>
                    <div className="text-xs text-slate-500">
                      {a.by} · {new Date(a.timestamp).toLocaleString()}
                    </div>
                    {a.details && <div className="text-xs text-slate-600 mt-0.5">{a.details}</div>}
                    {a.changes && (
                      <div className="text-xs text-slate-600 mt-0.5">
                        {Object.entries(a.changes).map(([k, v]) => {
                          if (k === 'assignedTo') {
                            const who = lookupAssigned(v);
                            return `${k}=${who ? who.name : v || 'Unassigned'}`;
                          }
                          return `${k}=${v}`;
                        }).join(', ')}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
