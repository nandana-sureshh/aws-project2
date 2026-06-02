import { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Plus, X } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { User } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [total, setTotal] = useState(0);
  const [doctorForm, setDoctorForm] = useState({
    email: '', password: '', firstName: '', lastName: '',
    specialization: '', licenseNumber: '', department: '', phone: '',
  });

  const loadUsers = async () => {
    try {
      const res = await adminApi.getUsers({ limit: 50, role: roleFilter || undefined });
      setUsers(res.data);
      setTotal(res.meta.total);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [roleFilter]);

  const handleToggle = async (id: string) => {
    try {
      const res = await adminApi.toggleUserStatus(id);
      toast.success(`User ${res.data.isActive ? 'activated' : 'deactivated'}`);
      await loadUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Operation failed');
    }
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminApi.createDoctor(doctorForm);
      toast.success('Doctor account created!');
      setShowDoctorModal(false);
      setDoctorForm({ email: '', password: '', firstName: '', lastName: '', specialization: '', licenseNumber: '', department: '', phone: '' });
      await loadUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create doctor');
    } finally {
      setCreating(false);
    }
  };

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-purple-500/20 text-purple-400',
    DOCTOR: 'bg-emerald-500/20 text-emerald-400',
    PATIENT: 'bg-blue-500/20 text-blue-400',
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {['', 'ADMIN', 'DOCTOR', 'PATIENT'].map((role) => (
            <button key={role} onClick={() => setRoleFilter(role)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${roleFilter === role ? 'bg-primary-600 text-white border-primary-500' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
              {role || 'All'} {role === '' && `(${total})`}
            </button>
          ))}
        </div>
        <button onClick={() => setShowDoctorModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Doctor
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4">User</th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4">Role</th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4">Status</th>
              <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4">Joined</th>
              <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-white/2 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-white text-sm font-semibold">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-slate-500 text-xs">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`badge-status ${roleColors[user.role]}`}>{user.role}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <span className={`text-sm ${user.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-slate-400 text-sm">{format(new Date(user.createdAt), 'MMM d, yyyy')}</td>
                <td className="p-4 text-right">
                  {user.role !== 'ADMIN' && (
                    <button
                      onClick={() => handleToggle(user.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ml-auto ${user.isActive ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
                    >
                      {user.isActive ? <><UserX size={14} /> Deactivate</> : <><UserCheck size={14} /> Activate</>}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDoctorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg">Create Doctor Account</h3>
              <button onClick={() => setShowDoctorModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateDoctor} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[['firstName', 'First Name'], ['lastName', 'Last Name']].map(([k, l]) => (
                  <div key={k}>
                    <label className="block text-sm font-medium text-slate-300 mb-2">{l}</label>
                    <input type="text" value={(doctorForm as any)[k]} onChange={(e) => setDoctorForm(f => ({ ...f, [k]: e.target.value }))} className="input-field" required />
                  </div>
                ))}
              </div>
              {[['email', 'Email', 'email'], ['password', 'Password', 'password'], ['specialization', 'Specialization', 'text'], ['licenseNumber', 'License Number', 'text'], ['department', 'Department', 'text'], ['phone', 'Phone', 'tel']].map(([k, l, t]) => (
                <div key={k}>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{l}</label>
                  <input type={t} value={(doctorForm as any)[k]} onChange={(e) => setDoctorForm(f => ({ ...f, [k]: e.target.value }))} className="input-field" required={['email', 'password', 'specialization', 'licenseNumber'].includes(k)} />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowDoctorModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary flex-1">{creating ? 'Creating...' : 'Create Doctor'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
