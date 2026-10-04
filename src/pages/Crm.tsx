import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { crmService, LEAD_STAGES, LeadStage } from '../services/crmService'
import { useAuth } from '../lib/auth'
export default function Crm() {
  const { orgId, can } = useAuth(); const qc = useQueryClient(); const [err, setErr] = useState(''); const manage = can('crm.manage')
  const q = useQuery({ queryKey: ['leads'], queryFn: crmService.list })
  const ok = () => { setErr(''); qc.invalidateQueries({ queryKey: ['leads'] }) }
  const add = useMutation({ mutationFn: (f: FormData) => crmService.create(orgId!, Object.fromEntries(f)), onSuccess: ok, onError: (e: Error) => setErr(e.message) })
  const move = useMutation({ mutationFn: (v: { id: string; s: LeadStage }) => crmService.setStage(v.id, v.s), onSuccess: ok, onError: (e: Error) => setErr(e.message) })
  return (<div className="space-y-4"><h1 className="font-display text-2xl font-semibold">Sales pipeline</h1>
    {manage && <form className="panel grid gap-2 sm:grid-cols-5" onSubmit={e => { e.preventDefault(); add.mutate(new FormData(e.currentTarget)); e.currentTarget.reset() }}><input name="name" required className="input" placeholder="Contact name" /><input name="company" className="input" placeholder="Company" /><input name="email" type="email" className="input" placeholder="Email" /><input name="value" type="number" min="0" className="input" placeholder="Deal value" /><button className="btn w-fit">Add lead</button></form>}
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    {q.isLoading ? <div className="panel h-32 animate-pulse" /> : <div className="grid gap-3 overflow-x-auto md:grid-cols-4 xl:grid-cols-7">{LEAD_STAGES.map(s => { const items = q.data?.filter((l: any) => l.stage === s) ?? []
      return (<section key={s} aria-label={s} className="min-w-40 rounded-md bg-black/5 p-2"><h2 className="mb-2 text-sm font-medium capitalize">{s} <span className="opacity-60">({items.length})</span></h2>
        <ul className="space-y-2">{items.map((l: any) => <li key={l.id} className="rounded bg-paper p-2 text-sm text-ink"><p className="font-medium">{l.name}</p><p className="text-xs opacity-60">{l.company}</p>{Number(l.value) > 0 && <p className="text-xs">{Number(l.value).toLocaleString()}</p>}
          {manage && <select aria-label={`Stage for ${l.name}`} className="input mt-1 py-1 text-xs" value={l.stage} onChange={e => move.mutate({ id: l.id, s: e.target.value as LeadStage })}>{LEAD_STAGES.map(x => <option key={x}>{x}</option>)}</select>}</li>)}</ul></section>) })}</div>}</div>)
}
