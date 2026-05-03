import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RoleBadge from './RoleBadge';

const linkBase     = 'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors';
const linkInactive = 'text-slate-300 hover:bg-slate-800 hover:text-white';
const linkActive   = 'bg-slate-800 text-white';

function Item({ to, icon, label, end }) {
  return (
    <NavLink to={to} end={end}
      className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
      <span className="w-5 h-5 inline-flex items-center justify-center">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

const ICONS = {
  list:    (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>),
  plus:    (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>),
  shield:  (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>),
  inbox:   (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>),
  out:     (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>),
};

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const role = user?.role;

  return (
    <aside className="bg-slate-900 text-slate-300 w-60 flex-shrink-0 flex flex-col">
      <div className="px-4 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-md flex items-center justify-center text-white font-bold">N</div>
          <span className="text-white font-semibold text-lg tracking-tight">NimbusDesk</span>
        </div>
        {user && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-slate-200 truncate">{user.name || user.email}</span>
            <RoleBadge role={role} />
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {role === 'Admin' && (
          <Item to="/app/admin" icon={ICONS.shield} label="All Tickets" />
        )}
        {role === 'Analyst' && (
          <Item to="/app/analyst" icon={ICONS.inbox} label="Assigned to Me" />
        )}
        {role === 'User' && (
          <>
            <Item to="/app/tickets" end icon={ICONS.list} label="My Tickets" />
            <Item to="/app/tickets/new" icon={ICONS.plus} label="Raise Ticket" />
          </>
        )}
      </nav>

      <div className="px-2 pb-4 border-t border-slate-800 pt-3">
        <button onClick={signOut} className={`${linkBase} ${linkInactive} w-full`}>
          <span className="w-5 h-5 inline-flex items-center justify-center">{ICONS.out}</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
