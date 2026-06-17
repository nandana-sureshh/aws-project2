import { useState, useEffect } from 'react';
import { ClipboardList, Plus, X, Sparkles, Download, ChevronDown, ChevronUp, FileText, Image, File } from 'lucide-react';
import { doctorsApi } from '../../api/doctors';
import { recordsApi } from '../../api/records';
import { Appointment, MedicalRecord, Document } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { documentsApi } from '../../api/documents';

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <Image size={18} className="text-emerald-400" />;
  if (mimeType === 'application/pdf') return <FileText size={18} className="text-red-400" />;
  return <File size={18} className="text-blue-400" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DoctorRecords() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<string>('');
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});
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

  const handleDownload = async (doc: Document) => {
    try {
      await documentsApi.download(doc.id, doc.originalName);
    } catch {
      toast.error('Download failed');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedDocs((prev) => ({ ...prev, [id]: !prev[id] }));
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

              {/* Patient Uploaded Reports Section */}
              {(appt.patient?.user as any)?.documents && (appt.patient?.user as any).documents.length > 0 && (
                <div className="mb-5 border-t border-slate-700/30 pt-4">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">
                    📁 Patient Uploaded Reports
                  </p>
                  <div className="space-y-2.5">
                    {(appt.patient?.user as any)?.documents?.map((doc: Document) => (
                      <div key={doc.id} className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/80 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                              <FileIcon mimeType={doc.mimeType} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-slate-200 text-sm font-medium truncate">{doc.originalName}</p>
                              <p className="text-slate-500 text-[11px]">
                                {formatSize(doc.size)} • {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {(doc.mimeType === 'application/pdf' || doc.mimeType === 'text/plain') && (
                              <button
                                onClick={() => toggleExpand(doc.id)}
                                className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-[11px] font-medium ${
                                  expandedDocs[doc.id]
                                    ? 'bg-primary-500/20 text-primary-400'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
                                }`}
                              >
                                <Sparkles size={13} className={doc.aiSummaryStatus === 'PROCESSING' ? 'animate-pulse text-primary-400' : ''} />
                                <span>AI Summary</span>
                                {expandedDocs[doc.id] ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                              </button>
                            )}
                            <button
                              onClick={() => handleDownload(doc)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                              title="Download Report"
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Summary Display */}
                        {expandedDocs[doc.id] && (
                          <div className="mt-1 pl-1 border-l-2 border-primary-500/30">
                            <div className="bg-slate-950/40 rounded-lg p-3 border border-slate-700/20 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                              <div className="flex items-center gap-1.5 text-primary-400 font-semibold uppercase tracking-wider text-[10px] mb-2">
                                <Sparkles size={11} />
                                <span>AI Analysis summary</span>
                              </div>
                              {doc.aiSummaryStatus === 'PROCESSING' || doc.aiSummaryStatus === 'PENDING' ? (
                                <div className="flex items-center gap-2 py-1 text-slate-400">
                                  <div className="w-3.5 h-3.5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin shrink-0" />
                                  <span>Generating summary...</span>
                                </div>
                              ) : (
                                doc.aiSummary
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
