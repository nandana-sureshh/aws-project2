import { useState, useEffect } from 'react';
import { Calendar, FileText, Upload, Activity, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { patientsApi } from '../../api/patients';
import { Appointment, PatientProfile } from '../../types';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-500/20 text-blue-400',
  CONFIRMED: 'bg-emerald-500/20 text-emerald-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
  COMPLETED: 'bg-slate-500/20 text-slate-400',
  NO_SHOW: 'bg-orange-500/20 text-orange-400',
};

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="glass-card p-6 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-slate-400 text-sm">{label}</p>
        <p className="text-white text-2xl font-bold mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, apptRes] = await Promise.all([
          patientsApi.getProfile(),
          patientsApi.getAppointments({ limit: 5 }),
        ]);
        setProfile(profileRes.data);
        setAppointments(apptRes.data);
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const upcoming = appointments.filter((a) => ['SCHEDULED', 'CONFIRMED'].includes(a.status));
  const completed = appointments.filter((a) => a.status === 'COMPLETED');

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
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-2xl font-bold">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Welcome, {user?.firstName}!</h2>
          <p className="text-slate-400 mt-1">
            {profile?.bloodGroup && <span className="mr-3">🩸 {profile.bloodGroup}</span>}
            {profile?.phone && <span>📞 {profile.phone}</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Calendar size={22} />} label="Upcoming" value={upcoming.length} color="bg-blue-500/20 text-blue-400" />
        <StatCard icon={<Activity size={22} />} label="Completed" value={completed.length} color="bg-emerald-500/20 text-emerald-400" />
        <StatCard icon={<FileText size={22} />} label="Records" value={completed.length} color="bg-purple-500/20 text-purple-400" />
        <StatCard icon={<User size={22} />} label="Profile" value={profile ? 'Complete' : 'Incomplete'} color="bg-orange-500/20 text-orange-400" />
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
            {appointments.map((appt) => (
              <div key={appt.id} className="p-5 flex items-center justify-between hover:bg-white/2 transition-colors">
                <div>
                  <p className="text-white font-medium">
                    Dr. {appt.doctor?.user.firstName} {appt.doctor?.user.lastName}
                  </p>
                  <p className="text-slate-400 text-sm mt-0.5">
                    {appt.doctor?.specialization} • {format(new Date(appt.scheduledAt), 'MMM d, yyyy h:mm a')}
                  </p>
                  <p className="text-slate-500 text-sm mt-0.5">{appt.reason}</p>
                </div>
                <span className={`badge-status ${statusColors[appt.status]}`}>{appt.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {profile && (
        <div className="glass-card p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <User size={18} className="text-primary-400" /> Profile Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Gender', value: profile.gender ?? 'Not set' },
              { label: 'Blood Group', value: profile.bloodGroup ?? 'Not set' },
              { label: 'Phone', value: profile.phone ?? 'Not set' },
              { label: 'Address', value: profile.address ?? 'Not set' },
              { label: 'Emergency Contact', value: profile.emergencyContact ?? 'Not set' },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-slate-500 text-xs uppercase tracking-wider">{item.label}</p>
                <p className="text-slate-200 text-sm mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
