import { Link } from 'react-router-dom';
import { Home, Heart } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary-500/30">
          <Heart size={40} className="text-white" />
        </div>
        <h1 className="text-7xl font-black text-white mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-slate-300 mb-3">Page Not Found</h2>
        <p className="text-slate-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          <Home size={16} /> Back to Home
        </Link>
      </div>
    </div>
  );
}
