import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quotationService } from '../services/quotationService'
import { useAuth } from '../lib/auth'
type L = { description: string; quantity: number; unit_price: number }
export default function Quotes() {
  const { orgId, can } = useAuth(); const qc = useQueryClient(); const staff = can('quotations.manage'); const [err, setErr] = useState('')
  const [cust, setCust] = useState(''); const [tax, setTax] = useState(18); const [valid, setValid] = useState(''); const [lines, setLines] = useState<L[]>([{ description: '', quantity: 1, unit_price: 0 }])
  const list = useQuery({ queryKey: ['quotes'], queryFn: quotationService.list })
  const custs = useQuery({ queryKey: ['custs'], queryFn: quotationService.customers, enabled: staff })
  const done = () => { setErr(''); qc.invalidateQueries({ queryKey: ['quotes'] }) }
  const create = useMutation({ mutationFn: () => quotationService.create(orgId!, { customer_id: cust, tax_rate: tax, valid_until: valid, lines }), onSuccess: () => { done(); setLines([{ description: '', quantity: 1, unit_price: 0 }]) }, onError: (e: Error) => setErr(e.message) })
  const send = useMutation({ mutationFn: (id: string) => quotationService.setStatus(id, 'sent'), onSuccess: done, onError: (e: Error) => setErr(e.message) })
  const reply = useMutation({ mutationFn: (v: { id: string; a: boolean }) => quotationService.respond(v.id, v.a), onSuccess: done, onError: (e: Error) => { setErr(e.message); qc.invalidateQueries({ queryKey: ['quotes'] }) } })
  const set = (i: number, k: keyof L, v: string) => setLines(lines.map((l, j) => j === i ? { ...l, [k]: k === 'description' ? v : Number(v) } : l))
  return (<div className="max-w-3xl space-y-4"><h1 className="font-display text-2xl font-semibold">Quotations</h1>
    {staff && <form onSubmit={e => { e.preventDefault(); create.mutate() }} className="panel space-y-3">
      <div className="grid gap-3 md:grid-cols-3"><select aria-label="Customer" required className="input" value={cust} onChange={e => setCust(e.target.value)}><option value="">Choose customer</option>{custs.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <label className="text-sm">Tax %<input type="number" className="input" value={tax} onChange={e => setTax(Number(e.target.value))} /></label><label className="text-sm">Valid until<input type="date" className="input" value={valid} onChange={e => setValid(e.target.value)} /></label></div>
      {lines.map((l, i) => <div key={i} className="grid grid-cols-6 gap-2"><input aria-label="Description" className="input col-span-3" placeholder="Item or service" value={l.description} onChange={e => set(i, 'description', e.target.value)} required />
        <input aria-label="Quantity" type="number" min="0.01" step="0.01" className="input" value={l.quantity} onChange={e => set(i, 'quantity', e.target.value)} /><input aria-label="Unit price" type="number" min="0" step="0.01" className="input" value={l.unit_price} onChange={e => set(i, 'unit_price', e.target.value)} />
        <button type="button" className="text-sm underline" onClick={() => setLines(lines.filter((_, j) => j !== i))} disabled={lines.length < 2}>Remove</button></div>)}
      <div className="flex gap-3"><button type="button" className="text-sm underline" onClick={() => setLines([...lines, { description: '', quantity: 1, unit_price: 0 }])}>Add line</button><button className="btn" disabled={create.isPending}>Save draft</button></div></form>}
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    {list.isLoading ? <div className="panel h-24 animate-pulse" /> : !list.data?.length ? <div className="panel text-sm">{staff ? 'No quotations yet. Create one above.' : 'No quotations have been sent to you.'}</div> :
      list.data.map((q: any) => <article key={q.id} className="panel space-y-2"><div className="flex justify-between"><span className="font-medium">{q.number} · {q.customers?.name}</span><span className="text-sm capitalize">{q.status}</span></div>
        <ul className="text-sm opacity-80">{q.quotation_items.map((i: any, k: number) => <li key={k}>{i.quantity}× {i.description} — {Number(i.unit_price).toLocaleString()}</li>)}</ul>
        <p className="font-display text-lg font-semibold">Total {Number(q.total).toLocaleString()} <span className="text-xs font-normal opacity-60">incl. {q.tax_rate}% tax{q.valid_until ? `, valid until ${q.valid_until}` : ''}</span></p>
        <div className="flex gap-2">{staff && q.status === 'draft' && <button className="btn" onClick={() => send.mutate(q.id)}>Send to customer</button>}
          {!staff && ['sent', 'viewed'].includes(q.status) && <><button className="btn" onClick={() => reply.mutate({ id: q.id, a: true })}>Accept</button><button className="rounded-md border border-black/20 px-4 py-2 text-sm" onClick={() => reply.mutate({ id: q.id, a: false })}>Decline</button></>}</div></article>)}</div>)
}
