import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, FileCheck2, RefreshCw, XCircle } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';

export const OnlineExamResults: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiService.getOnlineExamResults();
      setResults(res.results || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 15000);
    return () => {
      window.removeEventListener('focus', refresh);
      window.clearInterval(timer);
    };
  }, []);

  const allowed = ['FACULTY', 'CENTER_MANAGER', 'ADMIN', 'TEAM_LEAD', 'COUNSELLOR'].includes(user?.role || '');
  if (!allowed) {
    return <div className="p-8 bg-white border rounded-xl text-sm text-slate-600">Online exam results are not available for this role.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Online Exam Results</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Submitted online examination scores shared with the assigned Faculty and authorized centre management team.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Results
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border rounded-xl p-4"><div className="text-xs text-slate-500">Submitted</div><div className="text-2xl font-bold mt-1">{results.length}</div></div>
        <div className="bg-white border rounded-xl p-4"><div className="text-xs text-slate-500">Passed</div><div className="text-2xl font-bold text-emerald-600 mt-1">{results.filter(r => r.passed).length}</div></div>
        <div className="bg-white border rounded-xl p-4"><div className="text-xs text-slate-500">Not Cleared</div><div className="text-2xl font-bold text-rose-600 mt-1">{results.filter(r => !r.passed).length}</div></div>
        <div className="bg-white border rounded-xl p-4"><div className="text-xs text-slate-500">Role</div><div className="text-sm font-bold mt-2">{user?.role?.replace('_', ' ')}</div></div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-slate-500">Loading submitted examination results...</div>
        ) : results.length === 0 ? (
          <div className="py-20 text-center">
            <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700 mt-3">No submitted online exam results yet.</p>
            <p className="text-xs text-slate-500 mt-1">Results will appear here immediately after a student submits an online examination.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b text-[11px] uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Examination</th>
                  <th className="px-4 py-3">Course / Batch</th>
                  <th className="px-4 py-3">Trainer</th>
                  <th className="px-4 py-3 text-center">Score</th>
                  <th className="px-4 py-3 text-center">Result</th>
                  <th className="px-4 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((r) => (
                  <tr key={r.attempt_id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{r.student_name}</div>
                      <div className="text-[10px] text-slate-500">{r.student_code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{r.exam_title}</div>
                      <div className="text-[10px] text-slate-500">{r.exam_code}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{r.course_name}</div>
                      <div className="text-[10px] text-slate-400">{r.batch_name}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.trainer_name || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="font-bold text-slate-900">{r.score}/{r.total_marks}</div>
                      <div className="text-[10px] text-slate-500">{r.percentage}% · {r.correct_answers} correct</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.passed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> PASS</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold"><XCircle className="w-3.5 h-3.5" /> NOT CLEARED</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3" /> {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
