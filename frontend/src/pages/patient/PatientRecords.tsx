import { useState, useEffect } from 'react';
import { FileText, Calendar } from 'lucide-react';
import { recordsApi } from '../../api/records';
import { MedicalRecord } from '../../types';
import { format } from 'date-fns';

export default function PatientRecords() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await recordsApi.getMyRecords({ limit: 50 });
        setRecords(res.data);
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <p className="text-slate-400">{records.length} medical records</p>

      {records.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <FileText size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-slate-300 font-semibold mb-2">No medical records yet</h3>
          <p className="text-slate-500">Your doctor will add records after consultations</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <div key={record.id} className="glass-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-white font-semibold">
                    Dr. {record.doctor?.user.firstName} {record.doctor?.user.lastName}
                  </h3>
                  <p className="text-slate-400 text-sm flex items-center gap-2 mt-1">
                    <Calendar size={14} />
                    {record.appointment && format(new Date(record.appointment.scheduledAt), 'MMMM d, yyyy')}
                    {record.appointment && <span>• {record.appointment.reason}</span>}
                  </p>
                </div>
                <p className="text-slate-500 text-xs">{format(new Date(record.createdAt), 'MMM d, yyyy')}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { label: 'Diagnosis', value: record.diagnosis, icon: '🔍' },
                  { label: 'Treatment', value: record.treatment, icon: '💊' },
                  { label: 'Clinical Notes', value: record.notes, icon: '📝' },
                  { label: 'Prescription', value: record.prescription, icon: '📋' },
                ].map(({ label, value, icon }) =>
                  value ? (
                    <div key={label} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                      <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">{icon} {label}</p>
                      <p className="text-slate-200 text-sm leading-relaxed">{value}</p>
                    </div>
                  ) : null
                )}
              </div>

              {record.followUpDate && (
                <div className="mt-4 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                  <p className="text-primary-300 text-sm">
                    📅 Follow-up scheduled: <strong>{format(new Date(record.followUpDate), 'MMMM d, yyyy')}</strong>
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
