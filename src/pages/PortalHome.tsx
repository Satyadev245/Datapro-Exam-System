import React from 'react';
import { Building2, GraduationCap, LogIn, UserPlus, ShieldCheck, ArrowRight } from 'lucide-react';
import logo from "../assets/images/logo.png"

const go = (path: string) => { window.location.href = path; };

export const PortalHome: React.FC = () => (
  <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-5">
    <div className="w-full max-w-6xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold tracking-wider text-slate-300 uppercase">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Secure Examination Portal
        </div>
        {/* <h1 className="text-4xl sm:text-5xl font-black mt-5">DataPro Institute</h1> */}
        <div className='flex justify-center items-center'>
           <img src={logo} alt=""/>
        </div>
       
        <p className="text-slate-400 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
          Select your portal to continue. Management, Faculty and Students use separate secure entry points.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <section className="bg-white rounded-3xl p-7 text-slate-900 shadow-2xl card-hover border border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 mb-5">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black">Management</h2>
          <p className="text-sm text-slate-500 mt-2 leading-6">
            Center Manager, Team Lead, Admin and Counsellor access for monitoring and faculty management.
          </p>
          <button onClick={() => go('/management/login')} className="mt-7 w-full rounded-xl bg-blue-700 hover:bg-blue-800 text-white py-3 font-bold text-sm flex items-center justify-center gap-2">
            Management Login <ArrowRight className="w-4 h-4" />
          </button>
        </section>

        <section className="bg-white rounded-3xl p-7 text-slate-900 shadow-2xl card-hover border border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-700 mb-5">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black">Faculty</h2>
          <p className="text-sm text-slate-500 mt-2 leading-6">
            Faculty-only workspace for batches, question papers, online examinations, results and attendance.
          </p>
          <button onClick={() => go('/faculty/login')} className="mt-7 w-full rounded-xl bg-violet-700 hover:bg-violet-800 text-white py-3 font-bold text-sm flex items-center justify-center gap-2">
            Faculty Login <LogIn className="w-4 h-4" />
          </button>
        </section>

        <section className="bg-white rounded-3xl p-7 text-slate-900 shadow-2xl card-hover border border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 mb-5">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black">Student</h2>
          <p className="text-sm text-slate-500 mt-2 leading-6">
            Students have a separate login and registration flow for assigned examinations and results.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-7">
            <button onClick={() => go('/student/login')} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-3 font-bold text-sm flex items-center justify-center gap-2">
              <LogIn className="w-4 h-4" /> Login
            </button>
            <button onClick={() => go('/student/register')} className="rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 py-3 font-bold text-sm flex items-center justify-center gap-2">
              <UserPlus className="w-4 h-4" /> Register
            </button>
          </div>
        </section>
      </div>

      <p className="text-center text-[11px] text-slate-500 mt-8">Authorized users only · DataPro Institute Examination Management System</p>
    </div>
  </div>
);
