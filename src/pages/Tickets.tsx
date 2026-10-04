import { useState, FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ticketService } from '../services/ticketService'
import { useAuth } from '../lib/auth'
import TicketThread from '../components/TicketThread'
const STATUSES = ['open', 'in_progress', 'waiting', 'resolved', 'closed']
export default function Tickets() {
  const { orgId, can } = useAuth(); const qc = useQueryClient(); const [err, setErr] = useState(''); const [openId, setOpenId] = useState<string>()
  const { data, isLoading } = useQuery({ queryKey: ['tickets'], queryFn: ticketService.list })
  const create = useMutation({ mutationFn: (f: FormData) => ticketService.create(orgId!, Object.fromEntries(f)), onSuccess: () => { setErr(''); qc.invalidateQueries({ queryKey: ['tickets'] }) }, onError: (e: Error) => setErr(e.message) })
  const status = useMutation({ mutationFn: (v: { id: string; s: string }) => ticketService.setStatus(v.id, v.s), onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }) })
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = e.currentTarget; create.mutate(new FormData(f)); f.reset() }
  return (<div className="max-w-3xl space-y-4"><h1 className="font-display text-2xl font-semibold">Support</h1>
    <form onSubmit={submit} className="panel grid gap-3 md:grid-cols-3"><input name="subject" className="input md:col-span-2" placeholder="What do you need help with?" required minLength={3} />
      <select name="priority" className="input" defaultValue="normal"><option>low</option><option>normal</option><option>high</option><option>urgent</option></select>
      <textarea name="body" className="input md:col-span-3" rows={3} placeholder="Describe the issue" required /><button className="btn w-fit" disabled={create.isPending}>Open ticket</button>
      {err && <p role="alert" className="text-sm text-red-600 md:col-span-3">{err}</p>}</form>
    {isLoading ? <div className="panel h-24 animate-pulse" /> : !data?.length ? <div className="panel text-sm">No tickets. Open one above and we'll reply here.</div> :
      <ul className="space-y-2">{data.map((t: any) => <li key={t.id} className="panel"><div className="flex items-center justify-between gap-3"><span><span className="font-medium">{t.subject}</span><br /><span className="text-xs opacity-60">{t.priority} priority</span></span>
        {can('tickets.manage') ? <select aria-label="Status" className="input w-36" value={t.status} onChange={e => status.mutate({ id: t.id, s: e.target.value })}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select> : <span className="text-sm capitalize">{t.status.replace('_', ' ')}</span>}</div>
        <button className="mt-1 text-sm underline" onClick={() => setOpenId(openId === t.id ? undefined : t.id)} aria-expanded={openId === t.id}>{openId === t.id ? 'Hide conversation' : 'View conversation'}</button>{openId === t.id && <TicketThread id={t.id} />}</li>)}</ul>}</div>)
}
