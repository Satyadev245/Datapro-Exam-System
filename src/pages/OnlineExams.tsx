import React, { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, CheckCircle2, Clock3, Copy, ExternalLink, Plus, Users, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { Batch, Course, OnlineExam, OnlineExamQuestion } from '../types';
import { useToast } from '../components/common/Toast';

const emptyQuestion = (): OnlineExamQuestion => ({
  topic: '', question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A', marks: 1,
});


export const OnlineExams: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [exams, setExams] = useState<OnlineExam[]>([]);
  const [selected, setSelected] = useState<OnlineExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [topics, setTopics] = useState('');
  const [duration, setDuration] = useState('30');
  const [totalMarks, setTotalMarks] = useState('25');
  const [passingMarks, setPassingMarks] = useState('10');
  const [instructions, setInstructions] = useState('Answer all questions. The timer starts when the student opens the exam. The exam submits automatically when time ends.');
  const [questions, setQuestions] = useState<OnlineExamQuestion[]>([emptyQuestion()]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [generatingFromPdf, setGeneratingFromPdf] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canUse = user?.role === 'FACULTY';

  const load = async () => {
    setLoading(true);
    try {
      const [c, b, e] = await Promise.all([apiService.getCourses(), apiService.getBatches(), apiService.getOnlineExams()]);
      setCourses(c.courses); setBatches(b.batches); setExams(e.onlineExams);
      if (!courseId && c.courses[0]) setCourseId(String(c.courses[0].id));
    } catch (err: any) { showToast(err.message, 'error'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filteredBatches = useMemo(() => batches.filter(b => !courseId || String(b.course_id) === courseId), [batches, courseId]);
  useEffect(() => { if (filteredBatches.length && !filteredBatches.some(b => String(b.id) === batchId)) setBatchId(String(filteredBatches[0].id)); }, [filteredBatches]);

  const resetForm = () => {
    setTitle(''); setTopics(''); setDuration('30'); setTotalMarks('25'); setPassingMarks('10');
    setInstructions('Answer all questions. The timer starts when the student opens the exam. The exam submits automatically when time ends.');
    setQuestions([emptyQuestion()]); setPdfFile(null); setPdfGenerated(false); setShowCreate(false);
  };

  const updateQuestion = (index: number, key: keyof OnlineExamQuestion, value: string | number) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [key]: value } : q));
  };

  const generateFromPdf = async () => {
    if (!pdfFile) { showToast('Please select a PDF question paper first.', 'error'); return; }
    if (!topics.trim()) { showToast('Enter the course topics first so the generated questions are tagged correctly.', 'error'); return; }
    setGeneratingFromPdf(true);
    try {
      const res = await apiService.generateOnlineExamQuestionsFromPdf(pdfFile, topics.trim());
      setQuestions(res.questions);
      setTitle(prev => prev.trim() ? prev : res.title);
      setTotalMarks(String(res.questions.reduce((sum: number, q: OnlineExamQuestion) => sum + Number(q.marks || 1), 0)));
      setPdfGenerated(true);
      showToast(`${res.question_count} questions generated from the PDF.`, 'success');
    } catch (err: any) { showToast(err.message, 'error'); } finally { setGeneratingFromPdf(false); }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseId || !batchId || !topics.trim() || questions.some(q => !q.topic.trim() || !q.question_text.trim() || !q.option_a.trim() || !q.option_b.trim() || !q.option_c.trim() || !q.option_d.trim())) {
      showToast('Complete course, batch, topics, and every question before publishing.', 'error'); return;
    }
    setSubmitting(true);
    try {
      const res = await apiService.createOnlineExam({
        title: title.trim(), course_id: Number(courseId), batch_id: Number(batchId), topics: topics.trim(),
        duration_minutes: Number(duration), total_marks: Number(totalMarks), passing_marks: Number(passingMarks),
        instructions, questions: questions.map((q, i) => ({ ...q, question_order: i + 1, marks: Number(q.marks) || 1 })),
      });
      showToast(`${res.exam_code} created and assigned to the selected batch.`, 'success');
      resetForm(); await load();
    } catch (err: any) { showToast(err.message, 'error'); } finally { setSubmitting(false); }
  };

  const openAssignments = async (exam: OnlineExam) => {
    try {
      const res = await apiService.getOnlineExamAssignments(exam.id);
      setSelected({ ...exam, assignments: res.assignments });
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  const copy = async (link: string) => { await navigator.clipboard.writeText(link); showToast('Exam link copied.', 'success'); };


  if (!canUse) return <div className="p-8 bg-white border border-slate-200 rounded-xl text-sm text-slate-600">Online exam creation and exam management are available only to Faculty.</div>;
  if (loading) return <div className="py-20 text-center text-slate-500">Loading online examination studio...</div>;

  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Online Timed Examinations</h1><p className="text-sm text-slate-500 mt-1">Create course/topic-based MCQ exams, assign them to a batch, and publish secure exam links for active students in the Student Portal.</p></div>
      <button onClick={() => setShowCreate(v => !v)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"><Plus className="w-4 h-4"/>Create Online Exam</button>
    </div>

    {showCreate && <form onSubmit={create} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm">
      <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/60 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-900">Generate Exam from PDF</h2>
            <p className="text-xs text-slate-600 mt-1">Upload a text-based MCQ PDF. The system extracts numbered questions, A/B/C/D options, and the answer key automatically.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 rounded-lg text-xs font-semibold text-blue-700">
              <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={e=>setPdfFile(e.target.files?.[0] || null)} />
              Choose PDF
            </label>
            <button type="button" onClick={generateFromPdf} disabled={!pdfFile || generatingFromPdf} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-50">
              {generatingFromPdf ? 'Generating...' : 'Generate Questions'}
            </button>
          </div>
        </div>
        {pdfFile && <div className="mt-3 text-xs text-slate-700">Selected: <strong>{pdfFile.name}</strong> · {(pdfFile.size / 1024 / 1024).toFixed(2)} MB {pdfGenerated && <span className="ml-2 text-emerald-700 font-semibold">✓ Questions generated</span>}</div>}
        <p className="text-[11px] text-slate-500 mt-2">PDF should contain an answer key such as “Answer: B” or an “Answer Key” section. Scanned image-only PDFs need OCR.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <label className="text-xs font-semibold text-slate-700">Exam title<input value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="Python Basics - Topic Test"/></label>
        <label className="text-xs font-semibold text-slate-700">Course<select value={courseId} onChange={e=>setCourseId(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2">{courses.map(c=><option key={c.id} value={c.id}>{c.course_name}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-700">Batch<select value={batchId} onChange={e=>setBatchId(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2">{filteredBatches.map(b=><option key={b.id} value={b.id}>{b.batch_name} ({b.batch_code})</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-700">Topics<input value={topics} onChange={e=>setTopics(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="Python variables, data types, loops"/></label>
        <label className="text-xs font-semibold text-slate-700">Duration (minutes)<input type="number" min="1" max="300" value={duration} onChange={e=>setDuration(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2"/></label>
        <label className="text-xs font-semibold text-slate-700">Total marks<input type="number" min="1" value={totalMarks} onChange={e=>setTotalMarks(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2"/></label>
        <label className="text-xs font-semibold text-slate-700">Passing marks<input type="number" min="0" value={passingMarks} onChange={e=>setPassingMarks(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2"/></label>
        <label className="text-xs font-semibold text-slate-700 md:col-span-2">Instructions<textarea value={instructions} onChange={e=>setInstructions(e.target.value)} rows={3} className="mt-1 w-full border rounded-lg px-3 py-2"/></label>
      </div>
      <div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Generated Questions ({questions.length})</h2><p className="text-[11px] text-slate-500">These questions will be shown to the student as the timed online exam.</p></div><button type="button" onClick={()=>setQuestions(p=>[...p,emptyQuestion()])} className="text-xs font-semibold text-blue-600">+ Add question manually</button></div>
      <div className="space-y-4">{questions.map((q,i)=><div key={i} className="border rounded-xl p-4 bg-slate-50">
        <div className="flex justify-between gap-3 mb-3"><span className="text-xs font-bold text-slate-500">QUESTION {i+1}</span>{questions.length>1&&<button type="button" onClick={()=>setQuestions(p=>p.filter((_,x)=>x!==i))}><XCircle className="w-4 h-4 text-rose-500"/></button>}</div>
        <div className="grid md:grid-cols-2 gap-3">
          <input value={q.topic} onChange={e=>updateQuestion(i,'topic',e.target.value)} placeholder="Topic" className="border rounded-lg px-3 py-2 text-sm"/>
          <input value={q.question_text} onChange={e=>updateQuestion(i,'question_text',e.target.value)} placeholder="Question" className="border rounded-lg px-3 py-2 text-sm md:col-span-2"/>
          {(['a','b','c','d'] as const).map(k=><input key={k} value={(q as any)[`option_${k}`]} onChange={e=>updateQuestion(i,`option_${k}` as any,e.target.value)} placeholder={`Option ${k.toUpperCase()}`} className="border rounded-lg px-3 py-2 text-sm"/>)}
          <select value={q.correct_option} onChange={e=>updateQuestion(i,'correct_option',e.target.value)} className="border rounded-lg px-3 py-2 text-sm"><option value="A">Correct: A</option><option value="B">Correct: B</option><option value="C">Correct: C</option><option value="D">Correct: D</option></select>
          <input type="number" min="1" value={q.marks} onChange={e=>updateQuestion(i,'marks',Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm" placeholder="Marks"/>
        </div>
      </div>)}</div>
      <div className="flex justify-end gap-2"><button type="button" onClick={resetForm} className="px-4 py-2 border rounded-lg text-xs font-semibold">Cancel</button><button disabled={submitting} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold">{submitting?'Creating...':'Create & Assign to Batch'}</button></div>
    </form>}

    <div className="grid gap-4">{exams.map(exam=><div key={exam.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"><div><div className="flex items-center gap-2"><span className="font-mono text-xs text-blue-600">{exam.exam_code}</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${exam.status==='PUBLISHED'?'bg-emerald-100 text-emerald-700':exam.status==='CLOSED'?'bg-slate-100 text-slate-600':'bg-amber-100 text-amber-700'}`}>{exam.status}</span></div><h3 className="font-bold text-slate-900 mt-1">{exam.title}</h3><p className="text-xs text-slate-500 mt-1">{exam.course_name} · {exam.batch_name} · Topics: {exam.topics}</p></div><div className="flex items-center gap-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Clock3 className="w-4 h-4"/>{exam.duration_minutes} min</span><span className="inline-flex items-center gap-1"><BookOpenCheck className="w-4 h-4"/>{exam.question_count} questions</span><button onClick={()=>openAssignments(exam)} className="inline-flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg font-semibold"><Users className="w-4 h-4"/>Students & Exam Links</button></div></div></div>)}{exams.length===0&&<div className="p-10 text-center bg-white border border-slate-200 rounded-xl text-slate-500">No online exams created yet.</div>}</div>

    {selected && (() => {
      const assignments = selected.assignments || [];
      const hasStudents = assignments.length > 0;

      return (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden shadow-2xl border border-white/20 flex flex-col">
            <div className="px-5 py-4 sm:px-6 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Exam Delivery</span>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${selected.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{selected.status}</span>
                  </div>
                  <h2 className="font-bold text-lg sm:text-xl text-slate-900 mt-2 truncate">Batch-wise Exam Delivery</h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 truncate">{selected.title} · {selected.batch_name} · Unique secure exam link for every student.</p>
                </div>
                <button type="button" aria-label="Close exam delivery" onClick={() => setSelected(null)} className="shrink-0 w-9 h-9 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition">
                  <XCircle className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Students</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">{assignments.length}</div>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-blue-600 font-semibold">Exam Portal</div>
                  <div className="text-lg font-bold text-blue-700 mt-0.5">{selected.status === 'PUBLISHED' ? 'LIVE' : 'DRAFT'}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {selected.status !== 'PUBLISHED' && (
                  <button type="button" onClick={async () => { try { await apiService.publishOnlineExam(selected.id); showToast('Online exam published. Student Portal links updated.', 'success'); setSelected({ ...selected, status: 'PUBLISHED' }); await load(); await openAssignments({ ...selected, status: 'PUBLISHED' }); } catch (e: any) { showToast(e.message, 'error'); } }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition">
                    <CheckCircle2 className="w-4 h-4" /> Publish Exam & Update Student Portal
                  </button>
                )}
              </div>
            </div>

            {hasStudents ? (
              <>
                <div className="p-4 sm:p-5 overflow-auto space-y-3 bg-slate-50/40">
                  {assignments.map((a: any) => {
                    return (
                      <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition grid lg:grid-cols-[1fr_auto] gap-4 items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-semibold text-sm text-slate-900">{a.student_name}</div>
                            <span className="text-[10px] font-mono text-slate-400">{a.student_code}</span>
                            {a.attempt_status && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{a.attempt_status}</span>}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                                                      </div>
                          <div className="mt-3 flex items-center gap-2">
                            <input readOnly value={a.exam_link} aria-label={`Exam link for ${a.student_name}`} className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[11px] text-slate-600 outline-none" />
                            <button type="button" title="Copy exam link" onClick={() => copy(a.exam_link)} className="shrink-0 w-9 h-9 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center"><Copy className="w-4 h-4 text-slate-600" /></button>
                            <a href={a.exam_link} target="_blank" rel="noreferrer" title="Open exam link" className="shrink-0 w-9 h-9 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center"><ExternalLink className="w-4 h-4 text-slate-600" /></a>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 sm:p-12 bg-slate-50/60">
                <div className="max-w-md text-center">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                    <Users className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">No students assigned to this batch</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-6">This exam was created successfully, but there are no active students in the selected batch. Add or activate students in this batch and create the exam again to generate secure exam links.</p>
                  <div className="mt-5 inline-flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs font-semibold text-amber-700">
                    <Users className="w-4 h-4" /> Student Portal exam links are generated after active students are assigned to this batch.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    })()}

  </div>;
};
