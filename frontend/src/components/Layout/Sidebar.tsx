import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Upload,
  Users,
  Stethoscope,
  ClipboardList,
  Activity,
  LogOut,
  Heart,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const patientNav: NavItem[] = [
  { to: '/patient', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/patient/appointments', icon: <Calendar size={18} />, label: 'Appointments' },
  { to: '/patient/records', icon: <FileText size={18} />, label: 'Medical Records' },
  { to: '/patient/documents', icon: <Upload size={18} />, label: 'Documents' },
];

const doctorNav: NavItem[] = [
  { to: '/doctor', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/doctor/appointments', icon: <Calendar size={18} />, label: 'Appointments' },
  { to: '/doctor/records', icon: <ClipboardList size={18} />, label: 'Medical Records' },
];

const adminNav: NavItem[] = [
  { to: '/admin', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { to: '/admin/users', icon: <Users size={18} />, label: 'Users' },
  { to: '/admin/doctors', icon: <Stethoscope size={18} />, label: 'Doctors' },
  { to: '/admin/patients', icon: <Activity size={18} />, label: 'Patients' },
  { to: '/admin/appointments', icon: <Calendar size={18} />, label: 'Appointments' },
  { to: '/admin/audit-logs', icon: <FileText size={18} />, label: 'Audit Logs' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems =
    user?.role === 'ADMIN' ? adminNav : user?.role === 'DOCTOR' ? doctorNav : patientNav;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-800 flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <Heart size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">CareSync</h1>
            <p className="text-slate-500 text-xs mt-0.5">Healthcare Platform</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-white font-semibold text-sm">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              user?.role === 'ADMIN'
                ? 'bg-purple-500/20 text-purple-400'
                : user?.role === 'DOCTOR'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}>
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/patient' || item.to === '/doctor' || item.to === '/admin'}
            className={({ isActive }) =>
              isActive ? 'sidebar-link-active' : 'sidebar-link'
            }
          >
            {item.icon}
            <span className="text-sm font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
