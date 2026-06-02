import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout/Layout';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import NotFound from './pages/NotFound';

import PatientDashboard from './pages/patient/PatientDashboard';
import PatientAppointments from './pages/patient/PatientAppointments';
import PatientRecords from './pages/patient/PatientRecords';
import PatientDocuments from './pages/patient/PatientDocuments';

import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorAppointments from './pages/doctor/DoctorAppointments';
import DoctorRecords from './pages/doctor/DoctorRecords';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAppointments from './pages/admin/AdminAppointments';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Patient Routes */}
          <Route element={<ProtectedRoute allowedRoles={['PATIENT']}><Layout /></ProtectedRoute>}>
            <Route path="/patient" element={<PatientDashboard />} />
            <Route path="/patient/appointments" element={<PatientAppointments />} />
            <Route path="/patient/records" element={<PatientRecords />} />
            <Route path="/patient/documents" element={<PatientDocuments />} />
          </Route>

          {/* Doctor Routes */}
          <Route element={<ProtectedRoute allowedRoles={['DOCTOR']}><Layout /></ProtectedRoute>}>
            <Route path="/doctor" element={<DoctorDashboard />} />
            <Route path="/doctor/appointments" element={<DoctorAppointments />} />
            <Route path="/doctor/records" element={<DoctorRecords />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']}><Layout /></ProtectedRoute>}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/doctors" element={<AdminUsers />} />
            <Route path="/admin/patients" element={<AdminUsers />} />
            <Route path="/admin/appointments" element={<AdminAppointments />} />
            <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
