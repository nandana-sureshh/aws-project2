import { useState, useEffect, useRef } from 'react';
import { Upload, Download, Trash2, FileText, Image, File, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { documentsApi } from '../../api/documents';
import { Document } from '../../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <Image size={20} className="text-emerald-400" />;
  if (mimeType === 'application/pdf') return <FileText size={20} className="text-red-400" />;
  return <File size={20} className="text-blue-400" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PatientDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await documentsApi.getMyDocuments({ limit: 50 });
      setDocuments(res.data);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  // Poll documents every 5 seconds if any are in PENDING or PROCESSING state
  useEffect(() => {
    const hasActiveJobs = documents.some(
      (doc) => doc.aiSummaryStatus === 'PENDING' || doc.aiSummaryStatus === 'PROCESSING'
    );

    if (!hasActiveJobs) return;

    const interval = setInterval(() => {
      loadDocuments(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [documents]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await documentsApi.upload(file);
      toast.success('Document uploaded successfully. AI summary analysis started.');
      await loadDocuments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      await documentsApi.download(doc.id, doc.originalName);
    } catch {
      toast.error('Download failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await documentsApi.delete(id);
      toast.success('Document deleted');
      setDocuments((d) => d.filter((doc) => doc.id !== id));
    } catch {
      toast.error('Delete failed');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedDocs((prev) => ({ ...prev, [id]: !prev[id] }));
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
        <p className="text-slate-400">{documents.length} documents</p>
        <div>
          <input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.txt"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Upload size={16} />
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </div>

      <div
        className="glass-card p-8 border-2 border-dashed border-slate-700 hover:border-primary-500/50 transition-colors cursor-pointer text-center"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={36} className="text-slate-600 mx-auto mb-3" />
        <p className="text-slate-300 font-medium">Drop files here or click to upload</p>
        <p className="text-slate-500 text-sm mt-1">PDF and Text reports up to {parseInt(import.meta.env.VITE_MAX_FILE_SIZE_MB ?? '10')}MB support AI summarization</p>
      </div>

      {documents.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FileText size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="divide-y divide-slate-700/30">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 flex flex-col gap-3 hover:bg-white/2 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                    <FileIcon mimeType={doc.mimeType} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{doc.originalName}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {formatSize(doc.size)} • {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(doc.mimeType === 'application/pdf' || doc.mimeType === 'text/plain') && (
                      <button
                        onClick={() => toggleExpand(doc.id)}
                        className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium ${
                          expandedDocs[doc.id]
                            ? 'bg-primary-500/20 text-primary-400'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
                        }`}
                        title="AI Summary"
                      >
                        <Sparkles size={16} className={doc.aiSummaryStatus === 'PROCESSING' ? 'animate-pulse text-primary-400' : ''} />
                        <span>AI Summary</span>
                        {expandedDocs[doc.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {expandedDocs[doc.id] && (
                  <div className="pl-14 pr-4 pb-2">
                    <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/40 space-y-3">
                      <div className="flex items-center gap-2 text-primary-400 text-xs font-semibold uppercase tracking-wider">
                        <Sparkles size={14} />
                        <span>AI Summary Analysis</span>
                        {doc.aiSummaryStatus === 'PENDING' && (
                          <span className="ml-auto bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-normal lowercase">
                            queued
                          </span>
                        )}
                        {doc.aiSummaryStatus === 'PROCESSING' && (
                          <span className="ml-auto bg-primary-500/10 text-primary-400 text-[10px] px-2 py-0.5 rounded-full font-normal lowercase animate-pulse">
                            generating...
                          </span>
                        )}
                        {doc.aiSummaryStatus === 'COMPLETED' && (
                          <span className="ml-auto bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-normal lowercase">
                            ready
                          </span>
                        )}
                        {doc.aiSummaryStatus === 'FAILED' && (
                          <span className="ml-auto bg-red-500/10 text-red-400 text-[10px] px-2 py-0.5 rounded-full font-normal lowercase">
                            unavailable
                          </span>
                        )}
                      </div>

                      {doc.aiSummaryStatus === 'PROCESSING' || doc.aiSummaryStatus === 'PENDING' ? (
                        <div className="flex items-center gap-3 py-2 text-slate-400 text-sm">
                          <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin shrink-0" />
                          <p>Analyzing medical document and generating key summary highlights. Please wait...</p>
                        </div>
                      ) : doc.aiSummaryStatus === 'FAILED' ? (
                        <p className="text-slate-400 text-sm bg-slate-950/40 p-3 rounded-lg border border-red-500/10">
                          {doc.aiSummary || 'Failed to generate summary for this report.'}
                        </p>
                      ) : (
                        <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-line bg-slate-950/40 p-4 rounded-lg border border-slate-700/30">
                          {doc.aiSummary}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
