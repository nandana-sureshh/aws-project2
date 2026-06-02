import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { adminApi } from '../../api/admin';
import { AuditLog } from '../../types';
import { format } from 'date-fns';

const actionColors: Record<string, string> = {
  LOGIN: 'bg-blue-500/20 text-blue-400',
  REGISTER: 'bg-emerald-500/20 text-emerald-400',
  CREATE: 'bg-primary-500/20 text-primary-400',
  UPDATE: 'bg-yellow-500/20 text-yellow-400',
  DELETE: 'bg-red-500/20 text-red-400',
  UPLOAD: 'bg-purple-500/20 text-purple-400',
  SEED: 'bg-slate-500/20 text-slate-400',
};

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadLogs = async (p = 1) => {
    try {
      const res = await adminApi.getAuditLogs({ page: p, limit: 20 });
      setLogs(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(page); }, [page]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-slate-400">{total} total log entries</p>
      </div>

      <div className="glass-card overflow-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-700/50">
              {['Timestamp', 'User', 'Action', 'Resource', 'IP Address'].map((h) => (
                <th key={h} className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider p-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-white/2 transition-colors">
                <td className="p-4 text-slate-400 text-xs whitespace-nowrap">
                  {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                </td>
                <td className="p-4">
                  {log.user ? (
                    <div>
                      <p className="text-slate-200 text-sm">{log.user.firstName} {log.user.lastName}</p>
                      <p className="text-slate-500 text-xs">{log.user.email}</p>
                    </div>
                  ) : (
                    <span className="text-slate-600 text-sm">System</span>
                  )}
                </td>
                <td className="p-4">
                  <span className={`badge-status ${actionColors[log.action] ?? 'bg-slate-500/20 text-slate-400'}`}>
                    {log.action}
                  </span>
                </td>
                <td className="p-4">
                  <p className="text-slate-300 text-sm">{log.resource}</p>
                  {log.resourceId && (
                    <p className="text-slate-600 text-xs font-mono">{log.resourceId.slice(0, 8)}...</p>
                  )}
                </td>
                <td className="p-4 text-slate-500 text-xs font-mono">{log.ipAddress ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-4 py-2 disabled:opacity-40">Previous</button>
          <span className="text-slate-400 text-sm">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm px-4 py-2 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
