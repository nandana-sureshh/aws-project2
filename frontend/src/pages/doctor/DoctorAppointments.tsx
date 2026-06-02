import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, X } from 'lucide-react';
import { doctorsApi } from '../../api/doctors';
import { appointmentsApi } from '../../api/appointments';
import { Appointment } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CONFIRMED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
  COMPLETED: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  NO_SHOW: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const loadData = async () => {
    try {
      const res = await doctorsApi.getAppointments({
        limit: 50,
        status: statusFilter || undefined,
      });
      setAppointments(res.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await appointmentsApi.update(id, { status });
      toast.success(`Appointment ${status.toLowerCase()}`);
      await loadData();
    } catch {
      toast.error('Update failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 flex-wrap">
        {['', 'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              statusFilter === status
                ? 'bg-primary-600 text-white border-primary-500'
                : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white'
            }`}
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      {appointments.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Calendar size={48} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No appointments found</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="divide-y divide-slate-700/30">
            {appointments.map((appt) => (
              <div key={appt.id} className="p-5 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <p className="text-white font-medium">
                      {appt.patient?.user.firstName} {appt.patient?.user.lastName}
                    </p>
                    <span className={`badge-status border ${statusColors[appt.status]}`}>{appt.status}</span>
                  </div>
                  <p className="text-slate-300 text-sm">{appt.reason}</p>
                  {appt.notes && <p className="text-slate-500 text-xs mt-1 italic">{appt.notes}</p>}
                  <p className="text-slate-500 text-xs mt-1.5">
                    {format(new Date(appt.scheduledAt), 'EEEE, MMM d yyyy • h:mm a')} • {appt.duration} mins
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {appt.status === 'SCHEDULED' && (
                    <button
                      onClick={() => updateStatus(appt.id, 'CONFIRMED')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg text-xs font-medium transition-all border border-emerald-500/30"
                    >
                      <CheckCircle size={14} /> Confirm
                    </button>
                  )}
                  {['SCHEDULED', 'CONFIRMED'].includes(appt.status) && (
                    <button
                      onClick={() => updateStatus(appt.id, 'COMPLETED')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-xs font-medium transition-all border border-blue-500/30"
                    >
                      Complete
                    </button>
                  )}
                  {['SCHEDULED', 'CONFIRMED'].includes(appt.status) && (
                    <button
                      onClick={() => updateStatus(appt.id, 'CANCELLED')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-xs font-medium transition-all border border-red-500/30"
                    >
                      <X size={14} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
