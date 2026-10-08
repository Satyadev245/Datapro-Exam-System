import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/api';
import { Course, Batch } from '../types';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, UserPlus } from 'lucide-react';
import { validateStudentRegistration, cleanText, type FormErrors } from '../utils/validation';

export const Login: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState({name:'',email:'',mobile:'',password:'',course_id:'',batch_id:'',address:''});

  useEffect(() => { apiService.getRegistrationData().then(r => { setCourses(r.courses); setBatches(r.batches); }).catch(e => setError(e.message)); }, []);
  const filtered = useMemo(() => batches.filter(b => !form.course_id || String(b.course_id) === form.course_id), [batches, form.course_id]);
  const setField = (field: keyof typeof form, value: string) => { setForm(p => ({...p, [field]: value})); setErrors(p => ({...p, [field]: ''})); setError(''); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('');
    const next = validateStudentRegistration(form); setErrors(next);
    if (Object.keys(next).length) { setError('Please correct the highlighted fields.'); return; }
    setLoading(true);
    try {
      const r = await apiService.registerStudent({...form, name:cleanText(form.name), email:form.email.trim().toLowerCase(), mobile:form.mobile.trim(), address:cleanText(form.address), course_id:Number(form.course_id), batch_id:Number(form.batch_id)});
      setSuccess(`Registration successful. Student ID: ${r.student_id}. Your username is ${r.username}.`);
    } catch(e:any) { setError(e.message || 'Registration failed. Please try again.'); } finally { setLoading(false); }
  };
  const field = (name:string) => errors[name] ? { 'aria-invalid': true as const } : {};
  return <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6">
    <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/10">
      <div className="bg-gradient-to-br from-emerald-700 via-emerald-700 to-teal-800 text-white p-6 sm:p-8">
        <button onClick={()=>window.location.href='/'} className="text-white/75 hover:text-white text-xs font-bold flex items-center gap-2 mb-6"><ArrowLeft className="w-4 h-4"/>Back to Portal Selection</button>
        <div className="flex items-center gap-3"><div className="p-2.5 rounded-2xl bg-white/10"><UserPlus className="w-7 h-7"/></div><div><p className="text-xs uppercase tracking-[.2em] font-bold text-white/65">Student Portal</p><h1 className="text-2xl sm:text-3xl font-black">Student Registration</h1></div></div>
        <p className="text-sm text-white/75 mt-3 max-w-xl">Create your student account and select the course and batch you want to join.</p>
      </div>
      <form onSubmit={submit} noValidate className="p-6 sm:p-8 space-y-5">
        {error&&<div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700"><AlertCircle className="inline w-4 h-4 mr-1.5"/>{error}</div>}
        {success&&<div role="status" className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700"><CheckCircle2 className="inline w-4 h-4 mr-1.5"/>{success}<button type="button" onClick={()=>window.location.href='/student/login'} className="block mt-2 font-bold underline">Go to Student Login</button></div>}
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-xs font-bold text-slate-700">Full Name<input {...field('name')} value={form.name} onChange={e=>setField('name',e.target.value)} maxLength={80} autoComplete="name" className="mt-1.5 w-full border rounded-xl px-3 py-3" placeholder="Enter full name"/>{errors.name&&<div className="form-error">{errors.name}</div>}</label>
          <label className="text-xs font-bold text-slate-700">Mobile<input {...field('mobile')} value={form.mobile} onChange={e=>setField('mobile',e.target.value.replace(/[^0-9+\- ]/g,''))} maxLength={14} inputMode="tel" autoComplete="tel" className="mt-1.5 w-full border rounded-xl px-3 py-3" placeholder="10-digit mobile"/>{errors.mobile&&<div className="form-error">{errors.mobile}</div>}</label>
        </div>
        <label className="text-xs font-bold text-slate-700">Email<input {...field('email')} type="email" value={form.email} onChange={e=>setField('email',e.target.value)} maxLength={120} autoComplete="email" className="mt-1.5 w-full border rounded-xl px-3 py-3" placeholder="name@example.com"/>{errors.email&&<div className="form-error">{errors.email}</div>}</label>
        <label className="text-xs font-bold text-slate-700">Password<div className="relative"><input {...field('password')} type={show?'text':'password'} value={form.password} onChange={e=>setField('password',e.target.value)} maxLength={64} autoComplete="new-password" className="mt-1.5 w-full border rounded-xl px-3 py-3 pr-10" placeholder="At least 6 characters"/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)} className="absolute right-3 top-4 text-slate-400 hover:text-slate-700">{show?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button></div>{errors.password&&<div className="form-error">{errors.password}</div>}<div className="form-help">Use letters and numbers for a stronger password.</div></label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-xs font-bold text-slate-700">Course<select {...field('course_id')} value={form.course_id} onChange={e=>{setField('course_id',e.target.value);setField('batch_id','')}} className="mt-1.5 w-full border rounded-xl px-3 py-3"><option value="">Select course</option>{courses.map(c=><option key={c.id} value={c.id}>{c.course_name}</option>)}</select>{errors.course_id&&<div className="form-error">{errors.course_id}</div>}</label>
          <label className="text-xs font-bold text-slate-700">Batch<select {...field('batch_id')} value={form.batch_id} onChange={e=>setField('batch_id',e.target.value)} disabled={!form.course_id} className="mt-1.5 w-full border rounded-xl px-3 py-3 disabled:bg-slate-100"><option value="">{form.course_id?'Select batch':'Select course first'}</option>{filtered.map(b=><option key={b.id} value={b.id}>{b.batch_code} · {b.batch_name}</option>)}</select>{errors.batch_id&&<div className="form-error">{errors.batch_id}</div>}</label>
        </div>
        <label className="text-xs font-bold text-slate-700">Address <span className="font-normal text-slate-400">(optional)</span><textarea value={form.address} onChange={e=>setField('address',e.target.value)} maxLength={300} rows={3} className="mt-1.5 w-full border rounded-xl px-3 py-3" placeholder="Enter your address"/></label>
        <button disabled={loading||!!success} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3.5 font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">{loading?'Creating account...':'Register Student'}</button>
        <p className="text-center text-xs text-slate-500">Already registered? <button type="button" onClick={()=>window.location.href='/student/login'} className="font-bold text-emerald-700 hover:underline">Student Login</button></p>
      </form>
    </div>
  </div>;
};
