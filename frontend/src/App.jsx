import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { configureAmplify } from './config/amplify';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Spinner from './components/Spinner';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import UserDashboard from './pages/UserDashboard';
import RaiseTicketPage from './pages/RaiseTicketPage';
import AdminDashboard from './pages/AdminDashboard';
import AnalystDashboard from './pages/AnalystDashboard';
import NotFound from './pages/NotFound';

function homeForRole(role) {
  if (role === 'Admin')   return '/app/admin';
  if (role === 'Analyst') return '/app/analyst';
  return '/app/tickets';
}

configureAmplify();

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center text-slate-400">
      <Spinner size={32} />
    </div>
  );
}

function RequireAuth({ children, role }) {
  const { user, isLoading } = useAuth();
  const loc = useLocation();
  if (isLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (role && user.role !== role) return <Navigate to={homeForRole(user.role)} replace />;
  return children;
}

function AppRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homeForRole(user.role)} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            <Route path="/app" element={<RequireAuth><Layout /></RequireAuth>}>
              <Route index element={<AppRedirect />} />
              <Route path="tickets" element={<UserDashboard />} />
              <Route path="tickets/new" element={<RaiseTicketPage />} />
              <Route
                path="admin"
                element={
                  <RequireAuth role="Admin">
                    <AdminDashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="analyst"
                element={
                  <RequireAuth role="Analyst">
                    <AnalystDashboard />
                  </RequireAuth>
                }
              />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
