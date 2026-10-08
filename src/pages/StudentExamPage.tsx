import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { apiService } from '../services/api';

export const StudentExamPage: React.FC<{ token: string }> = ({ token }) => {
  const [exam, setExam] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try { setExam(await apiService.getPublicOnlineExam(token)); } catch (e:any) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(()=>{load();},[token]);

  useEffect(()=>{
    if (!attempt || result) return;
    const tick=()=>setSeconds(Math.max(0, Math.floor((new Date(attempt.expires_at).getTime()-Date.now())/1000)));
    tick(); const id=window.setInterval(tick,1000); return ()=>window.clearInterval(id);
  },[attempt,result]);

  useEffect(()=>{
    if (attempt && seconds===0 && !result && !submitting) submit(true);
  },[seconds, attempt, result, submitting]);

  // Exam integrity restrictions. These are deterrents, not a substitute for
  // server-side validation: the server remains authoritative for time and submission.
  useEffect(() => {
    if (!attempt || result) return;

    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    const preventCopyPaste = (e: ClipboardEvent) => e.preventDefault();
    const preventShortcuts = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (
        (e.ctrlKey || e.metaKey) && ['c', 'x', 'v', 'a', 'p', 's', 'u'].includes(key)
        || e.key === 'F12'
        || (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(key))
      ) {
        e.preventDefault();
      }
    };
    const warnBeforeLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Your examination is in progress. Leaving this page may interrupt your exam.';
    };

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('copy', preventCopyPaste);
    document.addEventListener('cut', preventCopyPaste);
    document.addEventListener('paste', preventCopyPaste);
    document.addEventListener('keydown', preventShortcuts);
    window.addEventListener('beforeunload', warnBeforeLeave);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('copy', preventCopyPaste);
      document.removeEventListener('cut', preventCopyPaste);
      document.removeEventListener('paste', preventCopyPaste);
      document.removeEventListener('keydown', preventShortcuts);
      window.removeEventListener('beforeunload', warnBeforeLeave);
    };
  }, [attempt, result]);

  const formatted = useMemo(()=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`,[seconds]);
  const answeredCount = useMemo(() => Object.keys(answers).filter(key => answers[key]).length, [answers]);
  const allQuestionsAnswered = !!exam?.questions?.length && answeredCount === exam.questions.length;

  const start = async()=>{
    setStarting(true);
    try{
      const a=await apiService.startPublicOnlineExam(token);
      setAttempt(a);
      setSeconds(Math.max(0,Math.floor((new Date(a.expires_at).getTime()-Date.now())/1000)));
      try { await document.documentElement.requestFullscreen?.(); } catch { /* Fullscreen can be blocked by the browser. */ }
    }catch(e:any){setError(e.message);}
    finally{setStarting(false);}
  };

  const submit = async(auto=false)=>{
    if(submitting)return;
    if(!auto && !allQuestionsAnswered) {
      setError(`Please answer all ${exam?.questions?.length || 0} questions before submitting.`);
      return;
    }
    setError('');
    setSubmitting(true);
    try{
      const r=await apiService.submitPublicOnlineExam(token,answers,auto);
      try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {}
      setResult(r);
    }catch(e:any){setError(e.message);}
    finally{setSubmitting(false);}
  };

  if(loading)return <div className="min-h-screen grid place-items-center bg-slate-950 text-white">Loading examination...</div>;
  if(error&&!exam)return <div className="min-h-screen grid place-items-center bg-slate-950 p-6"><div className="bg-white rounded-2xl p-8 max-w-lg text-center"><h1 className="font-bold text-xl text-slate-900">Exam unavailable</h1><p className="text-sm text-slate-500 mt-2">{error}</p></div></div>;
  if(result)return <div className="min-h-screen bg-slate-950 grid place-items-center p-6"><div className="bg-white rounded-2xl p-8 max-w-lg w-full text-center"><CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto"/><h1 className="text-2xl font-bold text-slate-900 mt-4">Exam Submitted</h1><p className="text-sm text-slate-500 mt-2">{result.student_name}, your examination has been submitted successfully.</p><div className="grid grid-cols-3 gap-3 mt-6"><div className="bg-slate-50 rounded-xl p-3"><div className="text-xl font-bold">{result.score}</div><div className="text-[11px] text-slate-500">Score</div></div><div className="bg-slate-50 rounded-xl p-3"><div className="text-xl font-bold">{result.correct_answers}</div><div className="text-[11px] text-slate-500">Correct</div></div><div className="bg-slate-50 rounded-xl p-3"><div className="text-xl font-bold">{result.total_questions}</div><div className="text-[11px] text-slate-500">Questions</div></div></div><div className="mt-5 text-sm font-semibold">{result.passed?'PASS':'NOT CLEARED'}</div></div></div>;

  if(!attempt)return <div className="min-h-screen bg-slate-950 p-4 sm:p-8"><div className="max-w-3xl mx-auto bg-white rounded-2xl overflow-hidden"><div className="p-8 bg-slate-900 text-white"><div className="flex items-center gap-2 text-blue-300 text-xs font-bold"><ShieldCheck className="w-4 h-4"/> SECURE STUDENT EXAM</div><h1 className="text-2xl font-bold mt-3">{exam.title}</h1><p className="text-sm text-slate-300 mt-2">{exam.student_name} · {exam.course_name} · {exam.batch_name}</p></div><div className="p-8 space-y-5"><div className="grid sm:grid-cols-3 gap-3"><div className="p-4 bg-slate-50 rounded-xl"><Clock3 className="w-4 h-4 text-blue-600"/><div className="font-bold mt-2">{exam.duration_minutes} minutes</div><div className="text-xs text-slate-500">Timed exam</div></div><div className="p-4 bg-slate-50 rounded-xl"><div className="font-bold">{exam.questions.length}</div><div className="text-xs text-slate-500">Questions</div></div><div className="p-4 bg-slate-50 rounded-xl"><div className="font-bold">{exam.total_marks}</div><div className="text-xs text-slate-500">Total marks</div></div></div><div><h2 className="font-bold">Topics</h2><p className="text-sm text-slate-600 mt-1">{exam.topics}</p></div><div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 whitespace-pre-line">{exam.instructions}</div><button disabled={starting} onClick={start} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">{starting?'Starting...':'Start Examination'}</button></div></div></div>;

  return <div className="min-h-screen bg-slate-100"><header className="sticky top-0 z-20 bg-slate-950 text-white shadow-lg"><div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between"><div><div className="text-xs text-blue-300 font-bold">{exam.exam_code}</div><div className="font-bold">{exam.title}</div></div><div className={`px-4 py-2 rounded-lg font-mono font-bold ${seconds<60?'bg-rose-600':'bg-slate-800'}`}><Clock3 className="w-4 h-4 inline mr-2"/>{formatted}</div></div></header><main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="sticky top-[61px] z-10 bg-white/95 backdrop-blur border rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
        <div className="text-xs font-semibold text-slate-700">
          Answered <span className="text-blue-700">{answeredCount}</span> / {exam.questions.length} questions
        </div>
        <div className={`text-xs font-bold ${allQuestionsAnswered ? 'text-emerald-700' : 'text-amber-700'}`}>
          {allQuestionsAnswered ? '✓ All questions answered' : `Answer ${exam.questions.length - answeredCount} more question${exam.questions.length - answeredCount === 1 ? '' : 's'}`}
        </div>
      </div>
      {exam.questions.map((q:any,i:number)=><div key={q.id} className="bg-white rounded-xl border p-5">
        <div className="flex gap-3">
          <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 grid place-items-center text-xs font-bold shrink-0">{i+1}</span>
          <div className="flex-1">
            <div className="text-[11px] font-bold uppercase text-slate-400">{q.topic} · {q.marks} mark{q.marks!==1?'s':''}</div>
            <h2 className="font-semibold text-slate-900 mt-1">{q.question_text}</h2>
            <div className="grid sm:grid-cols-2 gap-3 mt-4">{(['A','B','C','D'] as const).map(opt=>
              <label key={opt} className={`border rounded-xl p-3 cursor-pointer flex gap-3 ${answers[q.id]===opt?'border-blue-600 bg-blue-50':'border-slate-200'}`}>
                <input type="radio" name={`q-${q.id}`} checked={answers[q.id]===opt} onChange={()=>setAnswers(a=>({...a,[q.id]:opt}))}/>
                <span className="text-sm"><b>{opt}.</b> {q[`option_${opt.toLowerCase()}`]}</span>
              </label>
            )}</div>
          </div>
        </div>
      </div>)}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      <button
        disabled={submitting || !allQuestionsAnswered}
        onClick={()=>submit(false)}
        className={`w-full py-3 text-white rounded-xl font-bold shadow-lg ${allQuestionsAnswered ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400 cursor-not-allowed'}`}
      >
        {submitting ? 'Submitting...' : allQuestionsAnswered ? 'Submit Examination' : `Answer All Questions to Submit (${answeredCount}/${exam.questions.length})`}
      </button>
    </main></div>;
};
