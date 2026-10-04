import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trainingService } from '../services/trainingService'
import { useAuth } from '../lib/auth'
import CourseQuiz from '../components/CourseQuiz'
function Course({ id, onBack }: { id: string; onBack: () => void }) {
  const { can } = useAuth(); const qc = useQueryClient(); const [err, setErr] = useState(''); const [open, setOpen] = useState<string>()
  const q = useQuery({ queryKey: ['course', id], queryFn: () => trainingService.detail(id) })
  const refresh = () => { setErr(''); qc.invalidateQueries({ queryKey: ['course', id] }); qc.invalidateQueries({ queryKey: ['courses'] }) }
  const enroll = useMutation({ mutationFn: () => trainingService.enroll(id), onSuccess: refresh, onError: (e: Error) => setErr(e.message) })
  const done = useMutation({ mutationFn: (l: string) => trainingService.complete(l), onSuccess: refresh, onError: (e: Error) => setErr(e.message) })
  const add = useMutation({ mutationFn: (v: { t: string; c: string }) => trainingService.addLesson(id, (q.data?.lessons.length ?? 0) + 1, v.t, v.c), onSuccess: refresh, onError: (e: Error) => setErr(e.message) })
  const d = q.data; const pct = d?.lessons.length ? Math.round(100 * d.lessons.filter(l => d.done.has(l.id)).length / d.lessons.length) : 0
  return (<div className="max-w-2xl space-y-4"><button className="text-sm underline" onClick={onBack}>All courses</button>
    {q.isLoading || !d ? <div className="panel h-32 animate-pulse" /> : <>
      {d.enrolled ? <div className="panel"><div className="mb-1 flex justify-between text-sm"><span>Progress</span><span>{pct}%</span></div><div className="h-2 rounded bg-black/10"><div className="h-2 rounded bg-signal" style={{ width: pct + '%' }} /></div>
        {d.certificate && <p className="mt-3 text-sm">Certificate issued. ID <strong>{d.certificate}</strong> · <a className="underline" href={`/verify-certificate/${d.certificate}`}>Verification page</a></p>}</div> :
        <button className="btn" onClick={() => enroll.mutate()} disabled={enroll.isPending}>Enroll in this course</button>}
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
      <ol className="space-y-2">{d.lessons.map(l => <li key={l.id} className="panel"><button className="flex w-full justify-between text-left" onClick={() => setOpen(open === l.id ? undefined : l.id)} aria-expanded={open === l.id}><span className="font-medium">{l.position}. {l.title}</span><span className="text-sm">{d.done.has(l.id) ? 'Completed' : ''}</span></button>
        {open === l.id && <div className="mt-3 space-y-3 text-sm"><p className="whitespace-pre-wrap">{l.content}</p>{d.enrolled && !d.done.has(l.id) && <button className="btn" onClick={() => done.mutate(l.id)} disabled={done.isPending}>Mark complete</button>}</div>}</li>)}</ol>
      <button className="text-sm underline" onClick={() => window.dispatchEvent(new CustomEvent('forge:open-ai', { detail: { type: 'course', id, label: 'this course' } }))}>Ask the AI tutor about this course</button>
      <CourseQuiz courseId={id} enrolled={d.enrolled} />
      {can('training.manage') && <form className="panel space-y-2" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); add.mutate({ t: String(f.get('t')), c: String(f.get('c')) }); e.currentTarget.reset() }}>
        <input name="t" required className="input" placeholder="New lesson title" /><textarea name="c" rows={3} className="input" placeholder="Lesson content" /><button className="btn">Add lesson</button></form>}</>}</div>)
}
export default function Training() {
  const { orgId, can } = useAuth(); const qc = useQueryClient(); const [sel, setSel] = useState<string>(); const [err, setErr] = useState('')
  const list = useQuery({ queryKey: ['courses'], queryFn: trainingService.courses })
  const create = useMutation({ mutationFn: (v: { t: string; d: string }) => trainingService.createCourse(orgId!, v.t, v.d), onSuccess: () => { setErr(''); qc.invalidateQueries({ queryKey: ['courses'] }) }, onError: (e: Error) => setErr(e.message) })
  const pub = useMutation({ mutationFn: (id: string) => trainingService.publish(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }) })
  if (sel) return <Course id={sel} onBack={() => setSel(undefined)} />
  return (<div className="max-w-3xl space-y-4"><h1 className="font-display text-2xl font-semibold">Training</h1>
    {can('training.manage') && <form className="panel grid gap-3 md:grid-cols-3" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); create.mutate({ t: String(f.get('t')), d: String(f.get('d')) }); e.currentTarget.reset() }}>
      <input name="t" required minLength={3} className="input" placeholder="Course title" /><input name="d" className="input" placeholder="Short description" /><button className="btn w-fit">Create course</button></form>}
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    {list.isLoading ? <div className="panel h-24 animate-pulse" /> : !list.data?.length ? <div className="panel text-sm">No courses yet.</div> :
      <div className="grid gap-4 md:grid-cols-2">{list.data.map((c: any) => <article key={c.id} className="panel space-y-2"><h2 className="font-medium">{c.title}</h2><p className="text-sm opacity-70">{c.description}</p>
        <p className="text-xs capitalize opacity-60">{c.level} · {c.lessons?.[0]?.count ?? 0} lessons{!c.published && ' · draft'}</p>
        <div className="flex gap-2"><button className="btn" onClick={() => setSel(c.id)}>Open</button>{!c.published && can('training.manage') && <button className="rounded-md border border-black/20 px-4 py-2 text-sm" onClick={() => pub.mutate(c.id)}>Publish</button>}</div></article>)}</div>}</div>)
}
