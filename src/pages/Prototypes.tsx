import { useState, FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { prototypeService, STAGES } from '../services/prototypeService'
import { useAuth } from '../lib/auth'
import PrototypeWorkspace from '../components/PrototypeWorkspace'
export default function Prototypes() {
  const { orgId, can } = useAuth(); const qc = useQueryClient(); const [err, setErr] = useState(''); const [ws, setWs] = useState<string>()
  const { data, isLoading } = useQuery({ queryKey: ['protos'], queryFn: prototypeService.list })
  const ok = () => { setErr(''); qc.invalidateQueries({ queryKey: ['protos'] }) }
  const create = useMutation({ mutationFn: (f: FormData) => prototypeService.create(orgId!, Object.fromEntries(f)), onSuccess: ok, onError: (e: Error) => setErr(e.message) })
  const adv = useMutation({ mutationFn: (v: { id: string; to: string }) => prototypeService.advance(v.id, v.to), onSuccess: ok, onError: (e: Error) => setErr(e.message) })
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = e.currentTarget; create.mutate(new FormData(f)); f.reset() }
  return (<div className="max-w-3xl space-y-4"><h1 className="font-display text-2xl font-semibold">Build my product</h1>
    <form onSubmit={submit} className="panel grid gap-3 md:grid-cols-3"><input name="title" className="input md:col-span-3" placeholder="Project title" required minLength={3} />
      <textarea name="description" rows={3} className="input md:col-span-3" placeholder="What should it do? Include materials, constraints and any reference links." />
      <input name="budget" type="number" min="0" className="input" placeholder="Budget" /><input name="quantity" type="number" min="1" className="input" placeholder="Quantity" /><input name="target_date" type="date" aria-label="Target date" className="input" />
      <button className="btn w-fit" disabled={create.isPending}>Submit request</button></form>
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    {isLoading ? <div className="panel h-24 animate-pulse" /> : !data?.length ? <div className="panel text-sm">No requests yet. Describe what you want built above.</div> :
      data.map((p: any) => { const idx = STAGES.indexOf(p.status); return (<article key={p.id} className="panel space-y-2"><div className="flex justify-between"><span className="font-medium">{p.title}</span><span className="text-sm capitalize">{p.status}</span></div>
        <ol className="flex gap-1" aria-label="Progress">{STAGES.map((s, i) => <li key={s} title={s} className={`h-1.5 flex-1 rounded ${i <= idx ? 'bg-signal' : 'bg-black/10'}`} />)}</ol>
        {can('prototypes.manage') && <div className="flex gap-2">{prototypeService.next(p.status).map(n => <button key={n} className="btn" onClick={() => adv.mutate({ id: p.id, to: n })}>Move to {n}</button>)}</div>}
        <button className="text-sm underline" onClick={() => setWs(ws === p.id ? undefined : p.id)} aria-expanded={ws === p.id}>{ws === p.id ? 'Hide workspace' : 'Open workspace'}</button>{ws === p.id && <PrototypeWorkspace id={p.id} />}</article>) })}</div>)
}
