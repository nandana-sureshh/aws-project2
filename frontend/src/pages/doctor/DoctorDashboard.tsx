import { useState, useEffect } from 'react';
import { Calendar, Users, Stethoscope, ClipboardList } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { doctorsApi } from '../../api/doctors';
import { Appointment } from '../../types';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-500/20 text-blue-400',
  CONFIRMED: 'bg-emerald-500/20 text-emerald-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
  COMPLETED: 'bg-slate-500/20 text-slate-300',
  NO_SHOW: 'bg-orange-500/20 text-orange-400',
};

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await doctorsApi.getAppointments({ limit: 10 });
        setAppointments(res.data);
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const today = new Date().toDateString();
  const todayAppts = appointments.filter(
    (a) => new Date(a.scheduledAt).toDateString() === today
  );
  const upcoming = appointments.filter((a) => ['SCHEDULED', 'CONFIRMED'].includes(a.status));
  const completed = appointments.filter((a) => a.status === 'COMPLETED');
  const uniquePatients = new Set(appointments.map((a) => a.patientId)).size;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-card p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-2xl font-bold">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Dr. {user?.firstName} {user?.lastName}</h2>
          <p className="text-slate-400 mt-1">
            <span className="inline-flex items-center gap-1.5">
              <Stethoscope size={14} />
              {user?.doctor?.specialization ?? 'Doctor'}
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Calendar size={22} />, label: "Today's Appointments", value: todayAppts.length, color: 'bg-blue-500/20 text-blue-400' },
          { icon: <Calendar size={22} />, label: 'Upcoming', value: upcoming.length, color: 'bg-primary-500/20 text-primary-400' },
          { icon: <Users size={22} />, label: 'Total Patients', value: uniquePatients, color: 'bg-emerald-500/20 text-emerald-400' },
          { icon: <ClipboardList size={22} />, label: 'Completed', value: completed.length, color: 'bg-purple-500/20 text-purple-400' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-6 flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-slate-400 text-sm">{s.label}</p>
              <p className="text-white text-2xl font-bold mt-0.5">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-slate-700/50">
          <h3 className="text-white font-semibold">Recent Appointments</h3>
        </div>
        {appointments.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No appointments yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {appointments.slice(0, 8).map((appt) => (
              <div key={appt.id} className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">
                    {appt.patient?.user.firstName} {appt.patient?.user.lastName}
                  </p>
                  <p className="text-slate-400 text-sm mt-0.5">{appt.reason}</p>
                  <p className="text-slate-500 text-xs mt-1">
                    {format(new Date(appt.scheduledAt), 'MMM d, yyyy • h:mm a')}
                  </p>
                </div>
                <span className={`badge-status ${statusColors[appt.status]}`}>{appt.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
