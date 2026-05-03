// pages/LoginPage.jsx — Amplify v6 sign-in with the two-step
// NEW_PASSWORD_REQUIRED challenge baked in. Cognito creates seed users
// in FORCE_CHANGE_PASSWORD state (see infrastructure/01-cognito.sh); the
// first login flips into the "Set new password" panel and only then
// returns an ID token.
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const { signIn, completeNewPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [step, setStep] = useState('LOGIN');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function destinationFor(user) {
    const intended = loc.state?.from;
    if (intended && intended.startsWith('/app')) return intended;
    if (user?.role === 'Admin')   return '/app/admin';
    if (user?.role === 'Analyst') return '/app/analyst';
    return '/app/tickets';
  }

  async function submitLogin(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const r = await signIn({ email: email.trim(), password });
      if (r.status === 'NEW_PASSWORD_REQUIRED') { setStep('NEW_PWD'); return; }
      if (r.status === 'OK') nav(destinationFor(r.user), { replace: true });
      else setError(`Unexpected step: ${r.step || 'unknown'}`);
    } catch (err) {
      setError(err?.message || 'Sign in failed');
    } finally { setBusy(false); }
  }

  async function submitNewPassword(e) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) return setError('Password must be at least 8 characters.');
    if (newPassword !== confirmPwd) return setError('Passwords do not match.');
    setBusy(true);
    try {
      const r = await completeNewPassword(newPassword);
      if (r.status === 'OK') nav(destinationFor(r.user), { replace: true });
      else setError(`Unexpected step: ${r.step || 'unknown'}`);
    } catch (err) {
      setError(err?.message || 'Could not set new password');
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-md bg-indigo-600 text-white font-bold flex items-center justify-center">N</div>
          <span className="text-xl font-semibold text-slate-900">NimbusDesk</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-md p-7">
          {step === 'LOGIN' ? (
            <>
              <h1 className="text-lg font-semibold text-slate-900 mb-1">Sign in</h1>
              <p className="text-sm text-slate-500 mb-5">Use your NimbusDesk account to continue.</p>
              <form onSubmit={submitLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email" required autoFocus value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                  <input
                    type="password" required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {error && <div className="text-sm text-red-600">{error}</div>}
                <button
                  type="submit" disabled={busy}
                  className="w-full inline-flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50"
                >
                  {busy && <Spinner size={14} />} Sign in
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-slate-900 mb-1">Set a new password</h1>
              <p className="text-sm text-slate-500 mb-5">Your account requires a new password before you can continue.</p>
              <form onSubmit={submitNewPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
                  <input
                    type="password" required value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">At least 8 characters with upper, lower, and a number.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm new password</label>
                  <input
                    type="password" required value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {error && <div className="text-sm text-red-600">{error}</div>}
                <button
                  type="submit" disabled={busy}
                  className="w-full inline-flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50"
                >
                  {busy && <Spinner size={14} />} Update password
                </button>
              </form>
            </>
          )}
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">
          Powered by Amazon Cognito · ap-south-1
        </p>
      </div>
    </div>
  );
}
