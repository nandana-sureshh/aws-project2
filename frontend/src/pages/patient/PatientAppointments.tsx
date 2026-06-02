import { useState, useEffect } from 'react';
import { Calendar, Plus, X } from 'lucide-react';
import { patientsApi } from '../../api/patients';
import { doctorsApi } from '../../api/doctors';
import { appointmentsApi } from '../../api/appointments';
import { Appointment, DoctorProfile } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CONFIRMED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
  COMPLETED: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  NO_SHOW: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<(DoctorProfile & { user: { firstName: string; lastName: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ doctorId: '', scheduledAt: '', reason: '' });

  const loadData = async () => {
    try {
      const [apptRes, docRes] = await Promise.all([
        patientsApi.getAppointments({ limit: 50 }),
        doctorsApi.getAll({ limit: 100 }),
      ]);
      setAppointments(apptRes.data);
      setDoctors(docRes.data as any);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.doctorId || !form.scheduledAt || !form.reason) {
      toast.error('Please fill all fields');
      return;
    }
    setCreating(true);
    try {
      await appointmentsApi.create({
        doctorId: form.doctorId,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        reason: form.reason,
      });
      toast.success('Appointment created!');
      setShowModal(false);
      setForm({ doctorId: '', scheduledAt: '', reason: '' });
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to create appointment');
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await appointmentsApi.update(id, { status: 'CANCELLED' });
      toast.success('Appointment cancelled');
      await loadData();
    } catch {
      toast.error('Failed to cancel appointment');
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
      <div className="flex items-center justify-between">
        <p className="text-slate-400">{appointments.length} total appointments</p>
        <button
          id="new-appointment-btn"
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> Book Appointment
        </button>
      </div>

      {appointments.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Calendar size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-slate-300 font-semibold text-lg mb-2">No appointments</h3>
          <p className="text-slate-500 mb-6">Book your first appointment with a doctor</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">Book Now</button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="divide-y divide-slate-700/30">
            {appointments.map((appt) => (
              <div key={appt.id} className="p-5 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-white font-medium">
                      Dr. {appt.doctor?.user.firstName} {appt.doctor?.user.lastName}
                    </p>
                    <span className={`badge-status border ${statusColors[appt.status]}`}>{appt.status}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{appt.doctor?.specialization}</p>
                  <p className="text-slate-300 text-sm mt-1">{appt.reason}</p>
                  <p className="text-slate-500 text-xs mt-1.5">
                    {format(new Date(appt.scheduledAt), 'EEEE, MMM d yyyy • h:mm a')} • {appt.duration} mins
                  </p>
                </div>
                {appt.status === 'SCHEDULED' && (
                  <button
                    onClick={() => handleCancel(appt.id)}
                    className="btn-danger text-xs px-3 py-1.5 shrink-0"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg">Book Appointment</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Doctor</label>
                <select
                  id="appt-doctor"
                  value={form.doctorId}
                  onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value }))}
                  className="input-field"
                  required
                >
                  <option value="">Select a doctor</option>
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {(doc as any).user?.firstName} {(doc as any).user?.lastName} — {doc.specialization}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Date & Time</label>
                <input
                  id="appt-date"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  className="input-field"
                  min={new Date().toISOString().slice(0, 16)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Reason</label>
                <input
                  id="appt-reason"
                  type="text"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Brief description of your concern"
                  className="input-field"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button id="appt-submit" type="submit" disabled={creating} className="btn-primary flex-1">
                  {creating ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
