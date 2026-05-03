import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function TopBar({ title }) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
      <h1 className="text-base font-semibold text-slate-900">{title}</h1>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100"
        >
          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center">
            {(user?.email || '?').slice(0,1).toUpperCase()}
          </div>
          <span className="text-sm text-slate-700">{user?.email}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-30">
            <div className="px-3 py-2 text-xs text-slate-500 border-b">
              Signed in as <span className="text-slate-900 font-medium">{user?.role}</span>
            </div>
            <button
              onClick={signOut}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
