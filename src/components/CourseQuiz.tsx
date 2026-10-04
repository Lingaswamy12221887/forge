import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { trainingService } from '../services/trainingService'
import { useAuth } from '../lib/auth'
export default function CourseQuiz({ courseId, enrolled }: { courseId: string; enrolled: boolean }) {
  const { can } = useAuth(); const qc = useQueryClient(); const [ans, setAns] = useState<Record<string, number>>({}); const [res, setRes] = useState<{ score: number; total: number }>(); const [err, setErr] = useState('')
  const q = useQuery({ queryKey: ['quiz', courseId], queryFn: () => trainingService.quiz(courseId) })
  const submit = useMutation({ mutationFn: () => trainingService.submitQuiz(q.data!.id, ans), onSuccess: r => { setErr(''); setRes(r) }, onError: (e: Error) => setErr(e.message) })
  const add = useMutation({ mutationFn: (f: FormData) => trainingService.addQuestion(courseId, String(f.get('p')), String(f.get('o')).split('\n').map(x => x.trim()).filter(Boolean), Number(f.get('c')) - 1), onSuccess: () => { setErr(''); qc.invalidateQueries({ queryKey: ['quiz', courseId] }) }, onError: (e: Error) => setErr(e.message) })
  const qs = q.data?.quiz_questions ?? []
  return (<section className="panel space-y-3" aria-label="Quiz"><h2 className="font-medium">Quiz</h2>
    {!qs.length ? <p className="text-sm opacity-70">No quiz questions yet.</p> : enrolled ? <>
      {qs.map((x, i) => <fieldset key={x.id} className="space-y-1"><legend className="text-sm font-medium">{i + 1}. {x.prompt}</legend>{x.options.map((o, k) => <label key={k} className="flex items-center gap-2 text-sm"><input type="radio" name={x.id} checked={ans[x.id] === k} onChange={() => setAns({ ...ans, [x.id]: k })} />{o}</label>)}</fieldset>)}
      <button className="btn" disabled={submit.isPending || Object.keys(ans).length < qs.length} onClick={() => submit.mutate()}>Submit answers</button>
      {res && <p role="status" className="text-sm font-medium">You scored {res.score} of {res.total}.</p>}</> : <p className="text-sm opacity-70">Enroll to take the quiz.</p>}
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    {can('training.manage') && <form className="space-y-2 border-t border-black/10 pt-3" onSubmit={e => { e.preventDefault(); add.mutate(new FormData(e.currentTarget)); e.currentTarget.reset() }}><input name="p" required minLength={3} className="input" placeholder="Question" /><textarea name="o" required rows={3} className="input" placeholder={'One option per line (2 to 6)'} />
      <div className="flex items-center gap-2"><label className="text-sm">Correct option number <input name="c" type="number" min="1" max="6" required className="input inline w-20" /></label><button className="btn">Add question</button></div></form>}</section>)
}
