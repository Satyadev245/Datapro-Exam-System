import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { DashboardStats, Examination } from '../types';
import { StatusBadge } from '../components/common/Badge';
import {
  GraduationCap,
  Users2,
  BookOpen,
  Layers,
  FileText,
  FileUp,
  Clock,
  Calendar,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Eye,
  Download
} from 'lucide-react';
import { useToast } from '../components/common/Toast';
import trainerPortrait from '../assets/images/datapro_trainer_portrait_1791190526244.jpg';
import examHallPhoto from '../assets/images/datapro_exam_hall_1791190515075.jpg';

interface DashboardProps {
  onNavigate: (route: string) => void;
  onPreviewExam: (id: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onPreviewExam }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchStats = async () => {
    try {
      const data = await apiService.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Keep dashboard numbers and activity current after another staff member
    // creates/updates records. Refresh on window focus and every 30 seconds.
    const refreshOnFocus = () => fetchStats();
    const interval = window.setInterval(fetchStats, 30000);
    window.addEventListener('focus', refreshOnFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, []);

  const handleDownload = async (exam: Examination) => {
    try {
      showToast('Downloading examination file...', 'info');
      await apiService.downloadExamPaper(exam.id, exam.file_name);
      showToast('Downloaded successfully.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium">Loading institute dashboard...</p>
      </div>
    );
  }

  const role = user?.role || 'FACULTY';

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-6 sm:p-8 shadow-sm overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300">
              <span>DataPro Institute, Gajuwaka</span>
              <span aria-hidden="true">·</span>
              <span>Academic Year 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome back, {user?.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {role === 'FACULTY'
                ? 'Manage your assigned course curricula, prepare question papers, and submit mid-term & final examinations for administrative review.'
                : role === 'ADMIN'
                ? 'System root console: Institute-wide oversight of courses, batches, trainer submissions, security logs, and role permissions.'
                : role === 'CENTER_MANAGER'
                ? 'Gajuwaka Center Executive Portal: Monitor examination paper readiness, student admissions, and trainer course progressions.'
                : role === 'TEAM_LEAD'
                ? 'Technical Mentorship Dashboard: Supervise course coverage, batch milestones, and verify examination standards.'
                : role === 'COUNSELLOR'
                ? 'Student Academic Services: Track batch calendars, student registrations, and scheduled examination schedules.'
                : 'Institute Operations Management: Track student enrollments, exam papers, and trainer assessment submissions.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0" />
        </div>
      </div>

      {/* FACULTY VIEW */}
      {role === 'FACULTY' && (
        <div className="space-y-8">
          {/* Trainer Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Assigned Courses</span>
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {stats?.totalCourses || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Active software tracks</p>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Active Batches</span>
                <Layers className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {stats?.activeBatches || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Under your instruction</p>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Total Students</span>
                <GraduationCap className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {stats?.totalStudents || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Enrolled across batches</p>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Uploaded Papers</span>
                <FileText className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {stats?.uploadedPapers || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Submitted examination papers</p>
            </div>
          </div>

          {/* Assigned Batches */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Your Active Batches</h3>
                <p className="text-xs text-slate-500">Currently conducting at Gajuwaka</p>
              </div>
              <button
                onClick={() => onNavigate('batches')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>View Schedule</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {stats?.assignedBatches && stats.assignedBatches.length > 0 ? (
                stats.assignedBatches.map((b) => (
                  <div key={b.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <span>{b.batch_code}</span>
                        <span className="text-slate-400 font-normal">·</span>
                        <span className="text-slate-600 font-normal">{b.batch_name}</span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2">
                        <span>{b.course_name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-700">{b.timing}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 tabular-nums">
                        {b.student_count || 0}
                      </span>
                      <span className="text-slate-500 block text-[11px]">Students</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No batches assigned currently.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADMINISTRATIVE VIEW (Center Manager, Admin, Team Lead, Counsellor) */}
      {role !== 'FACULTY' && (
        <div className="space-y-8">
          {/* Top 5 Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-5 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Students</span>
                <GraduationCap className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {stats?.totalStudents || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Active enrollments</p>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Trainers</span>
                <Users2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {stats?.totalTrainers || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Active instructors</p>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Courses</span>
                <BookOpen className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {stats?.totalCourses || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Curricula tracks</p>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Batches</span>
                <Layers className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {stats?.totalBatches || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Active schedule</p>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">Examinations</span>
                <FileText className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {stats?.totalExaminations || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Papers deposited</p>
            </div>
          </div>

          {/* Center Overview & Course Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Course-wise enrollment breakdown */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Course-Wise Academic Distribution</h3>
                  <p className="text-xs text-slate-500">Student enrollment and examination density</p>
                </div>
                <button
                  onClick={() => onNavigate('reports')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>Detailed Analytics</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Course Name</th>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3 text-right">Students</th>
                      <th className="py-2.5 px-3 text-right">Exams</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats?.courseStats?.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-medium text-slate-900">{c.course_name}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono">{c.course_code}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-slate-800">
                          {c.student_count}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-slate-600">
                          {c.exam_count}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => onNavigate('courses')}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Center Facility Snapshot Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Gajuwaka Center Facilities</h3>
                <p className="text-xs text-slate-500 mt-0.5">Visakhapatnam, Andhra Pradesh</p>

                <div className="mt-4 rounded-lg overflow-hidden border border-slate-100 aspect-video relative">
                  <img
                    src={examHallPhoto}
                    alt="DataPro Software Lab"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Computer Labs</span>
                    <span className="font-semibold text-slate-800">3 Dedicated Labs</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Workstation Capacity</span>
                    <span className="font-semibold text-slate-800 tabular-nums">120 Terminals</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Center Lead</span>
                    <span className="font-semibold text-slate-800">Vara Prasad Sir</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Operating Timings</span>
                    <span className="font-semibold text-slate-800">07:30 AM – 08:30 PM</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4">
                <button
                  onClick={() => onNavigate('trainers')}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors text-center"
                >
                  View Faculty Directory
                </button>
              </div>
            </div>
          </div>

          {/* Institutional Activity Stream */}
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Institutional Activity Audit</h3>
                  <p className="text-xs text-slate-500">Real-time system events and logins</p>
                </div>
                {['ADMIN'].includes(role) && (
                  <button
                    onClick={() => onNavigate('activity-logs')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <span>Full Log</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100">
                {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                  stats.recentActivities.map((a) => (
                    <div key={a.id} className="py-2.5 flex items-start justify-between text-xs gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800">
                          {a.user_name || 'System'}{' '}
                          <span className="text-[10px] text-slate-400 font-normal">({a.user_role})</span>
                        </div>
                        <p className="text-slate-600 text-xs mt-0.5 leading-snug">{a.description}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0 tabular-nums">
                        {a.created_at.substring(11, 16)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <p className="font-medium text-slate-600">No recent activity logs</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">All staff actions and authentication events will stream here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
