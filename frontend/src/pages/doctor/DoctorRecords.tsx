import { useState, useEffect } from 'react';
import { ClipboardList, Plus, X } from 'lucide-react';
import { doctorsApi } from '../../api/doctors';
import { recordsApi } from '../../api/records';
import { Appointment, MedicalRecord } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function DoctorRecords() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<string>('');
  const [form, setForm] = useState<Partial<MedicalRecord>>({
    diagnosis: '',
    notes: '',
    treatment: '',
    prescription: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await doctorsApi.getAppointments({ status: 'COMPLETED', limit: 50 });
        setAppointments(res.data);
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) { toast.error('Select an appointment'); return; }
    setSaving(true);
    try {
      await recordsApi.create({ appointmentId: selectedAppt, ...form });
      toast.success('Medical record saved!');
      setShowModal(false);
      setForm({ diagnosis: '', notes: '', treatment: '', prescription: '' });
      setSelectedAppt('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  const apptWithoutRecord = appointments.filter((a) => !a.medicalRecord);
  const apptWithRecord = appointments.filter((a) => a.medicalRecord);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-slate-400">{apptWithRecord.length} records created</p>
        {apptWithoutRecord.length > 0 && (
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Add Medical Record
          </button>
        )}
      </div>

      {apptWithRecord.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <ClipboardList size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-slate-300 font-semibold mb-2">No medical records yet</h3>
          <p className="text-slate-500">Complete appointments to add medical records</p>
        </div>
      ) : (
        <div className="space-y-4">
          {apptWithRecord.map((appt) => (
            <div key={appt.id} className="glass-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-white font-semibold">
                    {appt.patient?.user.firstName} {appt.patient?.user.lastName}
                  </p>
                  <p className="text-slate-500 text-xs">
                    {format(new Date(appt.scheduledAt), 'MMM d, yyyy')} • {appt.reason}
                  </p>
                </div>
              </div>
              {appt.medicalRecord && (
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { label: 'Diagnosis', value: appt.medicalRecord.diagnosis },
                    { label: 'Treatment', value: appt.medicalRecord.treatment },
                    { label: 'Notes', value: appt.medicalRecord.notes },
                    { label: 'Prescription', value: appt.medicalRecord.prescription },
                  ].map(({ label, value }) =>
                    value ? (
                      <div key={label} className="bg-slate-800/50 rounded-lg p-3">
                        <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{label}</p>
                        <p className="text-slate-200 text-sm">{value}</p>
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-2xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg">Add Medical Record</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Appointment</label>
                <select
                  value={selectedAppt}
                  onChange={(e) => setSelectedAppt(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Select completed appointment</option>
                  {apptWithoutRecord.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.patient?.user.firstName} {a.patient?.user.lastName} — {format(new Date(a.scheduledAt), 'MMM d, yyyy')}
                    </option>
                  ))}
                </select>
              </div>
              {[
                { key: 'diagnosis', label: 'Diagnosis' },
                { key: 'notes', label: 'Clinical Notes' },
                { key: 'treatment', label: 'Treatment Plan' },
                { key: 'prescription', label: 'Prescription' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
                  <textarea
                    value={(form as any)[key] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    rows={3}
                    className="input-field resize-none"
                    placeholder={`Enter ${label.toLowerCase()}...`}
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
