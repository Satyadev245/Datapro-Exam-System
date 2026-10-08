import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Download, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { apiService } from '../services/api';
import { useToast } from '../components/common/Toast';

export const AttendanceManagement: React.FC = () => {
  const { showToast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiService.getAttendanceSubmissions();
      setRows(res.submissions || []);
    } catch (e: any) {
      showToast(e.message || 'Unable to load attendance submissions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const download = async (id: number, fileName?: string) => {
    try {
      const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
      const token = localStorage.getItem('datapro_auth_token');
      const res = await fetch(`${base}/attendance-submissions/${id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to download attendance file.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || `attendance-${id}.xls`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      showToast(e.message || 'Download failed.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
            <ClipboardCheck className="w-4 h-4" /> Attendance Management
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Faculty Attendance Submissions</h1>
          <p className="text-sm text-slate-500 mt-1">Every submitted attendance record is available here for Center Manager, Admin and Team Lead review.</p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5"><div className="text-xs text-slate-500">Total submissions</div><div className="text-2xl font-bold text-slate-900 mt-1">{rows.length}</div></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5"><div className="text-xs text-slate-500">Latest batch</div><div className="text-sm font-bold text-slate-900 mt-2">{rows[0]?.batch_code || '—'}</div></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5"><div className="text-xs text-slate-500">Latest faculty</div><div className="text-sm font-bold text-slate-900 mt-2">{rows[0]?.faculty_name || '—'}</div></div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? <div className="p-12 text-center text-sm text-slate-500">Loading attendance submissions...</div> : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-500"><FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-slate-300"/><div className="font-semibold text-slate-800">No attendance submissions yet</div><p className="text-xs mt-1">Faculty submissions will appear here immediately after they submit attendance.</p></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm app-table"><thead className="bg-slate-50 border-b border-slate-200"><tr><th className="p-4 text-left">Date</th><th className="p-4 text-left">Course</th><th className="p-4 text-left">Batch</th><th className="p-4 text-left">Faculty</th><th className="p-4 text-left">File</th><th className="p-4 text-left">Submitted At</th><th className="p-4 text-right">Action</th></tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"><td className="p-4 font-semibold text-slate-800">{r.attendance_date}</td><td className="p-4 text-slate-600">{r.course_name}</td><td className="p-4"><span className="font-semibold text-blue-700">{r.batch_code}</span><div className="text-xs text-slate-500">{r.batch_name}</div></td><td className="p-4 text-slate-700">{r.faculty_name}</td><td className="p-4 text-slate-600">{r.file_name || '—'}</td><td className="p-4 text-xs text-slate-500">{String(r.submitted_at || '').replace('T',' ').slice(0,19)}</td><td className="p-4 text-right"><button onClick={() => download(r.id, r.file_name)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"><Download className="w-4 h-4"/>Download</button></td></tr>)}</tbody></table></div>
        )}
      </div>
    </div>
  );
};
