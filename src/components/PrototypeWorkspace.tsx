import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workspaceService, TASK_STATES } from '../services/workspaceService'
import { useAuth } from '../lib/auth'
export default function PrototypeWorkspace({ id }: { id: string }) {
  const { orgId, can, session } = useAuth(); const qc = useQueryClient(); const [err, setErr] = useState(''); const staff = can('prototypes.manage')
  const tasks = useQuery({ queryKey: ['tasks', id], queryFn: () => workspaceService.tasks(id) })
  const comments = useQuery({ queryKey: ['comments', id], queryFn: () => workspaceService.comments(id) })
  const ok = (k: string) => () => { setErr(''); qc.invalidateQueries({ queryKey: [k, id] }) }
  const bad = (e: Error) => setErr(e.message)
  const add = useMutation({ mutationFn: (f: FormData) => workspaceService.addTask(orgId!, id, Object.fromEntries(f)), onSuccess: ok('tasks'), onError: bad })
  const move = useMutation({ mutationFn: (v: { id: string; s: string }) => workspaceService.setTask(v.id, v.s), onSuccess: ok('tasks'), onError: bad })
  const say = useMutation({ mutationFn: (b: string) => workspaceService.comment(id, b), onSuccess: ok('comments'), onError: bad })
  return (<div className="space-y-4 border-t border-black/10 pt-3">
    <div className="grid gap-3 md:grid-cols-3">{TASK_STATES.map(s => <section key={s} aria-label={s} className="rounded-md bg-black/5 p-2"><h3 className="mb-2 text-sm font-medium capitalize">{s}</h3>
      <ul className="space-y-2">{tasks.data?.filter((t: any) => t.status === s).map((t: any) => <li key={t.id} className="rounded bg-paper p-2 text-sm text-ink"><p>{t.title}</p>{t.due_date && <p className="text-xs opacity-60">Due {t.due_date}</p>}
        {staff && <select aria-label="Move task" className="input mt-1 py-1 text-xs" value={t.status} onChange={e => move.mutate({ id: t.id, s: e.target.value })}>{TASK_STATES.map(x => <option key={x}>{x}</option>)}</select>}</li>)}</ul></section>)}</div>
    {staff && <form className="flex gap-2" onSubmit={e => { e.preventDefault(); add.mutate(new FormData(e.currentTarget)); e.currentTarget.reset() }}><input name="title" required minLength={2} className="input" placeholder="New task" /><input name="due_date" type="date" aria-label="Due date" className="input w-40" /><button className="btn">Add</button></form>}
    <div className="space-y-2"><h3 className="text-sm font-medium">Comments</h3>
      {!comments.data?.length && <p className="text-sm opacity-70">No comments yet.</p>}
      {comments.data?.map((c: any) => <p key={c.id} className={`rounded-md p-2 text-sm ${c.author_id === session?.user.id ? 'ml-8 bg-signal text-white' : 'mr-8 bg-black/5'}`}>{c.body}</p>)}
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); const f = e.currentTarget; const v = String(new FormData(f).get('b') ?? ''); if (v.trim()) say.mutate(v); f.reset() }}><input name="b" className="input" aria-label="Comment" placeholder="Write a comment" /><button className="btn">Post</button></form></div>
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}</div>)
}
