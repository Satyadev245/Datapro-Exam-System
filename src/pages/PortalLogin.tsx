import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

type Portal = 'management' | 'faculty' | 'student';

const config: Record<Portal, { title: string; subtitle: string; roles: UserRole[]; color: string }> = {
  management: {
    title: 'Management Login',
    subtitle: 'Center Manager, Team Lead, Admin and Counsellor access',
    roles: ['CENTER_MANAGER', 'ADMIN', 'TEAM_LEAD', 'COUNSELLOR'],
    color: 'blue',
  },
  faculty: {
    title: 'Faculty Login',
    subtitle: 'Access batches, examinations, results and attendance',
    roles: ['FACULTY'],
    color: 'violet',
  },
  student: {
    title: 'Student Login',
    subtitle: 'Access assigned online examinations and results',
    roles: ['STUDENT'],
    color: 'emerald',
  },
};

export const PortalLogin: React.FC<{ portal: Portal }> = ({ portal }) => {
  const { login, logout } = useAuth();
  const c = config[portal];
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setFieldError('');
    if (!identifier.trim()) { setFieldError('Username or email is required.'); return; }
    if (!password) { setFieldError('Password is required.'); return; }
    setLoading(true);
    try {
      const loggedInUser = await login(identifier, password);
      if (!c.roles.includes(loggedInUser.role as UserRole)) {
        await logout();
        throw new Error(`This account belongs to the ${loggedInUser.role.replaceAll('_', ' ')} portal. Please use the correct login.`);
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally { setLoading(false); }
  };

  const back = () => { window.location.href = '/'; };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button onClick={back} className="text-slate-400 hover:text-white text-xs font-bold flex items-center gap-2 mb-5">
          <ArrowLeft className="w-4 h-4" /> Back to Portal Selection
        </button>
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className={`p-8 text-white ${portal === 'management' ? 'bg-blue-800' : portal === 'faculty' ? 'bg-violet-800' : 'bg-emerald-700'}`}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center"><ShieldCheck className="w-6 h-6" /></div>
              <div><p className="text-xs uppercase tracking-widest font-bold text-white/70">DataPro Institute</p><h1 className="text-2xl font-black mt-1">{c.title}</h1></div>
            </div>
            <p className="text-sm text-white/75 mt-4">{c.subtitle}</p>
          </div>
          <form onSubmit={submit} noValidate className="p-8 space-y-5">
            {(error || fieldError) && <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700"><AlertCircle className="inline w-4 h-4 mr-1" />{error || fieldError}</div>}
            <label className="block text-xs font-bold text-slate-700">Username / Email
              <input aria-invalid={!!fieldError && !identifier.trim()} autoComplete="username" value={identifier} onChange={e => { setIdentifier(e.target.value); setFieldError(''); }} maxLength={120} required className="mt-1.5 w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-200" />
            </label>
            <label className="block text-xs font-bold text-slate-700">Password
              <div className="relative"><input aria-invalid={!!fieldError && !password} type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => { setPassword(e.target.value); setFieldError(''); }} maxLength={128} required className="mt-1.5 w-full border border-slate-200 rounded-xl px-4 py-3 pr-11 outline-none focus:ring-2 focus:ring-blue-200" /><button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-4 text-slate-400">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
            </label>
            <button disabled={loading} className={`w-full text-white rounded-xl py-3.5 font-bold text-sm disabled:opacity-50 ${portal === 'management' ? 'bg-blue-700 hover:bg-blue-800' : portal === 'faculty' ? 'bg-violet-700 hover:bg-violet-800' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              <LogIn className="inline w-4 h-4 mr-2" />{loading ? 'Signing in...' : 'Sign In'}
            </button>
            {portal === 'student' && <p className="text-center text-xs text-slate-500">New student? <button type="button" onClick={() => { window.location.href = '/student/register'; }} className="font-bold text-emerald-700">Register here</button></p>}
          </form>
        </div>
      </div>
    </div>
  );
};
