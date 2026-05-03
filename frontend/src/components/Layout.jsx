import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const TITLES = {
  '/app/tickets': 'My Tickets',
  '/app/tickets/new': 'Raise Ticket',
  '/app/admin': 'All Tickets',
  '/app/analyst': 'Assigned to Me',
};

export default function Layout() {
  const { pathname } = useLocation();
  const title = TITLES[pathname] || 'NimbusDesk';
  return (
    <div className="h-screen flex bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
