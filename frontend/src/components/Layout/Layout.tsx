import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

const titleMap: Record<string, string> = {
  '/patient': 'Patient Dashboard',
  '/patient/appointments': 'My Appointments',
  '/patient/records': 'Medical Records',
  '/patient/documents': 'My Documents',
  '/doctor': 'Doctor Dashboard',
  '/doctor/appointments': 'Appointments',
  '/doctor/records': 'Medical Records',
  '/admin': 'Admin Dashboard',
  '/admin/users': 'User Management',
  '/admin/doctors': 'Doctor Management',
  '/admin/patients': 'Patient Management',
  '/admin/appointments': 'Appointment Management',
  '/admin/audit-logs': 'Audit Logs',
};

export function Layout() {
  const location = useLocation();
  const title = titleMap[location.pathname] ?? 'CareSync';

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title={title} />
        <main className="flex-1 p-6 overflow-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
