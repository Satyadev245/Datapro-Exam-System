import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileUp,
  FileText,
  BookOpenCheck,
  CheckCircle2,
  BookOpen,
  Layers,
  GraduationCap,
  Users2,
  BarChart3,
  History,
  ClipboardCheck,
  ShieldCheck,
  UserCircle,
  X
} from 'lucide-react';

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onNavigate,
  isOpenMobile,
  onCloseMobile
}) => {
  const { user } = useAuth();
  const role = user?.role || 'FACULTY';

  // Define navigational links according to user role permissions
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['CENTER_MANAGER', 'ADMIN', 'TEAM_LEAD', 'COUNSELLOR', 'FACULTY'],
    },
    {
      id: 'online-exams',
      label: 'Online Exams & Send',
      icon: BookOpenCheck,
      roles: ['FACULTY'],
      highlight: true,
    },
    {
      id: 'online-exam-results',
      label: 'Online Exam Results',
      icon: CheckCircle2,
      roles: ['CENTER_MANAGER', 'ADMIN', 'TEAM_LEAD', 'COUNSELLOR', 'FACULTY'],
    },
    {
      id: 'courses',
      label: role === 'FACULTY' ? 'My Courses' : 'Course Catalog',
      icon: BookOpen,
      roles: ['CENTER_MANAGER', 'ADMIN', 'TEAM_LEAD', 'COUNSELLOR', 'FACULTY'],
    },
    {
      id: 'batches',
      label: role === 'FACULTY' ? 'My Batches' : 'Batch Schedule',
      icon: Layers,
      roles: ['CENTER_MANAGER', 'ADMIN', 'TEAM_LEAD', 'COUNSELLOR', 'FACULTY'],
    },
    {
      id: 'students',
      label: role === 'FACULTY' ? 'My Students' : 'Students Enrollment',
      icon: GraduationCap,
      roles: ['CENTER_MANAGER', 'ADMIN', 'TEAM_LEAD', 'COUNSELLOR', 'FACULTY'],
    },
    {
      id: 'attendance',
      label: ['CENTER_MANAGER','ADMIN','TEAM_LEAD','ADMIN'].includes(role) ? 'Attendance Submissions' : 'Student Attendance',
      icon: ClipboardCheck,
      roles: ['FACULTY','CENTER_MANAGER','ADMIN','TEAM_LEAD','ADMIN'],
    },
    {
      id: 'trainers',
      label: role === 'TEAM_LEAD' ? 'Assigned Faculty' : 'Faculty Directory',
      icon: Users2,
      roles: ['CENTER_MANAGER', 'ADMIN', 'TEAM_LEAD'],
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      roles: ['CENTER_MANAGER', 'ADMIN', 'TEAM_LEAD'],
    },
    {
      id: 'activity-logs',
      label: 'Audit & Activity Log',
      icon: History,
      roles: ['ADMIN', 'CENTER_MANAGER'],
    },
    {
      id: 'users',
      label: 'User Management',
      icon: ShieldCheck,
      roles: ['ADMIN'],
    },
    {
      id: 'profile',
      label: 'Profile & Security',
      icon: UserCircle,
      roles: ['CENTER_MANAGER', 'ADMIN', 'TEAM_LEAD', 'COUNSELLOR', 'FACULTY'],
    },
  ];

  const visibleNav = navItems.filter((item) => item.roles.includes(role));

  const handleLinkClick = (id: string) => {
    onNavigate(id);
    onCloseMobile();
  };

  const content = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 w-64 border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
            DP
          </div>
          <div className="leading-tight">
            <span className="font-bold text-white text-sm tracking-tight block">DATAPRO</span>
            <span className="text-[11px] text-slate-400 block tracking-normal">Gajuwaka Center</span>
          </div>
        </div>
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleLinkClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : item.highlight
                  ? 'bg-blue-900/40 text-blue-200 hover:bg-blue-900/60 border border-blue-700/50'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-blue-300' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Institute Footer details */}
      <div className="p-4 border-t border-slate-800 shrink-0 text-[11px] text-slate-500 leading-normal">
        <p className="font-semibold text-slate-400">DataPro InfoTech Ltd.</p>
        <p>Main Road, Gajuwaka, Vizag</p>
        <p className="tabular-nums text-slate-600 mt-1">v2.6.4 · Exam Portal</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden lg:block shrink-0">{content}</aside>

      {/* Mobile drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10">{content}</div>
        </div>
      )}
    </>
  );
};
