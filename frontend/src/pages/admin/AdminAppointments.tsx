import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { appointmentsApi } from '../../api/appointments';
import { Appointment } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-500/20 text-blue-400',
  CONFIRMED: 'bg-emerald-500/20 text-emerald-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
  COMPLETED: 'bg-slate-500/20 text-slate-300',
  NO_SHOW: 'bg-orange-500/20 text-orange-400',
};

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);

  const loadData = async () => {
    try {
      const res = await appointmentsApi.getAll({ limit: 50, status: statusFilter || undefined });
      setAppointments(res.data);
      setTotal(res.meta.total);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [statusFilter]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await appointmentsApi.update(id, { status });
      toast.success('Status updated');
      await loadData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          {['', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${statusFilter === s ? 'bg-primary-600 text-white border-primary-500' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
              {s || `All (${total})`}
            </button>
          ))}
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Calendar size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No appointments found</p>
        </div>
      ) : (
        <div className="glass-card overflow-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-700/50">
                {['Patient', 'Doctor', 'Date & Time', 'Reason', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {appointments.map((appt) => (
                <tr key={appt.id} className="hover:bg-white/2 transition-colors">
                  <td className="p-4 text-white text-sm">{appt.patient?.user.firstName} {appt.patient?.user.lastName}</td>
                  <td className="p-4 text-slate-300 text-sm">Dr. {appt.doctor?.user.firstName} {appt.doctor?.user.lastName}</td>
                  <td className="p-4 text-slate-400 text-sm whitespace-nowrap">{format(new Date(appt.scheduledAt), 'MMM d, yyyy h:mm a')}</td>
                  <td className="p-4 text-slate-400 text-sm max-w-[200px] truncate">{appt.reason}</td>
                  <td className="p-4"><span className={`badge-status ${statusColors[appt.status]}`}>{appt.status}</span></td>
                  <td className="p-4">
                    {['SCHEDULED', 'CONFIRMED'].includes(appt.status) && (
                      <select
                        value={appt.status}
                        onChange={(e) => handleStatusChange(appt.id, e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="SCHEDULED">SCHEDULED</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELLED">CANCELLED</option>
                        <option value="NO_SHOW">NO_SHOW</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
