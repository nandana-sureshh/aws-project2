import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const demoCredentials = [
    { label: 'Admin', email: 'admin@caresync.com', password: 'Admin@123' },
    { label: 'Doctor', email: 'dr.smith@caresync.com', password: 'Doctor@123' },
    { label: 'Patient', email: 'patient1@caresync.com', password: 'Patient@123' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
      const role = JSON.parse(atob(localStorage.getItem('accessToken')!.split('.')[1])).role;
      const redirectMap: Record<string, string> = { ADMIN: '/admin', DOCTOR: '/doctor', PATIENT: '/patient' };
      navigate(redirectMap[role] ?? '/patient');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary-900 via-slate-900 to-slate-950 items-center justify-center p-12">
        <div className="max-w-md">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-2xl shadow-primary-500/30">
              <Heart size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">CareSync</h1>
              <p className="text-primary-300 text-sm mt-1">Cloud-Native Healthcare Platform</p>
            </div>
          </div>
          <p className="text-slate-300 text-lg leading-relaxed mb-8">
            Streamline patient care with intelligent appointment scheduling, secure medical records, and real-time notifications.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { stat: '99.9%', label: 'Uptime SLA' },
              { stat: 'HIPAA', label: 'Compliant' },
              { stat: 'AWS', label: 'Ready' },
              { stat: '256-bit', label: 'Encryption' },
            ].map((item) => (
              <div key={item.stat} className="glass rounded-xl p-4">
                <p className="text-primary-400 font-bold text-2xl">{item.stat}</p>
                <p className="text-slate-400 text-sm">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Heart size={20} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">CareSync</h1>
          </div>

          <div className="glass-card p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
            <p className="text-slate-400 mb-8">Sign in to your account to continue</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input-field pl-10"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field pl-10 pr-10"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3 text-sm font-semibold"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-700/50 pt-6">
              <p className="text-slate-500 text-xs mb-3 font-medium uppercase tracking-wider">Demo Credentials</p>
              <div className="grid grid-cols-3 gap-2">
                {demoCredentials.map((cred) => (
                  <button
                    key={cred.label}
                    id={`demo-${cred.label.toLowerCase()}`}
                    type="button"
                    onClick={() => { setEmail(cred.email); setPassword(cred.password); }}
                    className="text-center p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-primary-500/50 transition-all duration-200"
                  >
                    <p className="text-primary-400 text-xs font-semibold">{cred.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <p className="text-slate-400 text-sm text-center mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
