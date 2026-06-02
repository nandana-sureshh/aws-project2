import { useState, useEffect } from 'react';
import { Users, Stethoscope, Calendar, Activity, TrendingUp } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { AuditLog } from '../../types';
import { formatDistanceToNow } from 'date-fns';

interface Stats {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusBreakdown, setStatusBreakdown] = useState<{ status: string; count: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminApi.getStats();
        setStats(res.data.stats);
        setStatusBreakdown(res.data.appointmentsByStatus);
        setRecentActivity(res.data.recentActivity);
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: <Users size={22} />, color: 'bg-primary-500/20 text-primary-400' },
    { label: 'Patients', value: stats.totalPatients, icon: <Activity size={22} />, color: 'bg-blue-500/20 text-blue-400' },
    { label: 'Doctors', value: stats.totalDoctors, icon: <Stethoscope size={22} />, color: 'bg-emerald-500/20 text-emerald-400' },
    { label: 'Appointments', value: stats.totalAppointments, icon: <Calendar size={22} />, color: 'bg-purple-500/20 text-purple-400' },
  ];

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-500',
    CONFIRMED: 'bg-emerald-500',
    COMPLETED: 'bg-slate-500',
    CANCELLED: 'bg-red-500',
    NO_SHOW: 'bg-orange-500',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="glass-card p-6 flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-slate-400 text-sm">{s.label}</p>
              <p className="text-white text-3xl font-bold mt-0.5">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-400" /> Appointments by Status
          </h3>
          <div className="space-y-3">
            {statusBreakdown.map((item) => {
              const pct = stats.totalAppointments > 0 ? Math.round((item.count / stats.totalAppointments) * 100) : 0;
              return (
                <div key={item.status}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-300">{item.status}</span>
                    <span className="text-slate-400">{item.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${statusColors[item.status] ?? 'bg-slate-500'} transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-slate-700/50">
            <h3 className="text-white font-semibold">Recent Activity</h3>
          </div>
          <div className="divide-y divide-slate-700/30 max-h-72 overflow-y-auto">
            {recentActivity.map((log) => (
              <div key={log.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-300 text-sm">
                      <span className="text-primary-400 font-medium">{log.action}</span>
                      {' '}{log.resource}
                      {log.resourceId && <span className="text-slate-600"> #{log.resourceId.slice(0, 8)}</span>}
                    </p>
                    {log.user && (
                      <p className="text-slate-500 text-xs mt-0.5">
                        by {log.user.firstName} {log.user.lastName} ({log.user.role})
                      </p>
                    )}
                  </div>
                  <p className="text-slate-600 text-xs shrink-0 ml-4">
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
