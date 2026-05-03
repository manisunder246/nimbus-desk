import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center px-4">
      <div className="text-6xl font-bold text-slate-300">404</div>
      <h1 className="text-xl font-semibold text-slate-900 mt-2">Page not found</h1>
      <p className="text-sm text-slate-500 mt-1">The page you're looking for doesn't exist.</p>
      <Link to="/" className="mt-5 inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-md">
        Back to home
      </Link>
    </div>
  );
}
