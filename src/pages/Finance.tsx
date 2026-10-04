import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financeService } from '../services/financeService'
import { netProfit } from '../lib/finance'
import { useAuth } from '../lib/auth'
export default function Finance() {
  const { orgId, can } = useAuth(); const qc = useQueryClient(); const [err, setErr] = useState(''); const manage = can('finance.manage')
  const inv = useQuery({ queryKey: ['inv'], queryFn: financeService.invoices }), exps = useQuery({ queryKey: ['exp'], queryFn: financeService.expenses, enabled: can('finance.view') })
  const open = useQuery({ queryKey: ['invoiceable'], queryFn: financeService.invoiceable, enabled: manage }), rev = useQuery({ queryKey: ['rev'], queryFn: financeService.revenue, enabled: can('finance.view') })
  const done = () => { setErr(''); ['inv', 'exp', 'invoiceable', 'rev'].forEach(k => qc.invalidateQueries({ queryKey: [k] })) }
  const mk = useMutation({ mutationFn: (id: string) => financeService.createInvoice(id), onSuccess: done, onError: (e: Error) => setErr(e.message) })
  const ex = useMutation({ mutationFn: (f: FormData) => financeService.addExpense(orgId!, Object.fromEntries(f)), onSuccess: done, onError: (e: Error) => setErr(e.message) })
  const ref = useQuery({ queryKey: ['refundable'], queryFn: financeService.refundable, enabled: manage })
  const rf = useMutation({ mutationFn: (id: string) => financeService.refund(id, 'Customer refund'), onSuccess: () => { done(); qc.invalidateQueries({ queryKey: ['refundable'] }) }, onError: (e: Error) => setErr(e.message) })
  const spent = (exps.data ?? []).reduce((a: number, e: any) => a + Number(e.amount), 0)
  return (<div className="max-w-3xl space-y-4"><h1 className="font-display text-2xl font-semibold">{can('finance.view') ? 'Finance' : 'Invoices'}</h1>
    {can('finance.view') && <div className="grid gap-3 sm:grid-cols-3">{[['Collected', rev.data ?? 0], ['Expenses', spent], ['Net', netProfit(rev.data ?? 0, spent)]].map(([k, v]) => <div key={k as string} className="panel"><p className="text-sm opacity-70">{k}</p><p className="font-display text-2xl font-semibold">{Number(v).toLocaleString()}</p></div>)}</div>}
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    {manage && <div className="panel space-y-2"><h2 className="font-medium">Create invoice</h2>{open.data?.length ? open.data.map((o: any) => <div key={o.id} className="flex items-center justify-between text-sm"><span>#{o.id.slice(0, 8)} · {o.currency} {Number(o.total).toLocaleString()}</span><button className="btn" onClick={() => mk.mutate(o.id)}>Invoice</button></div>) : <p className="text-sm opacity-70">Every confirmed order has an invoice.</p>}</div>}
    {manage && !!ref.data?.length && <div className="panel space-y-2"><h2 className="font-medium">Refund a paid order</h2>{ref.data.map((p: any) => <div key={p.order_id} className="flex items-center justify-between text-sm"><span>#{p.order_id.slice(0, 8)} · {p.currency} {Number(p.amount).toLocaleString()} via {p.provider}</span><button className="rounded-md border border-red-600 px-3 py-1 text-red-600" onClick={() => { if (confirm('Refund this order in full? This cannot be undone.')) rf.mutate(p.order_id) }}>Refund</button></div>)}</div>}
    <section className="space-y-2"><h2 className="font-medium">Invoices</h2>{inv.isLoading ? <div className="panel h-16 animate-pulse" /> : !inv.data?.length ? <div className="panel text-sm">No invoices yet.</div> : inv.data.map((i: any) => <div key={i.id} className="panel flex items-center justify-between text-sm"><span><strong>{i.number}</strong> · {new Date(i.issued_at).toLocaleDateString()}</span><span>{i.currency} {Number(i.total).toLocaleString()} · <span className="capitalize">{i.status}</span></span></div>)}
      <button className="text-sm underline print:hidden" onClick={() => window.print()}>Print or save as PDF</button></section>
    {manage && <section className="space-y-2 print:hidden"><h2 className="font-medium">Expenses</h2><form className="grid gap-2 sm:grid-cols-4" onSubmit={e => { e.preventDefault(); ex.mutate(new FormData(e.currentTarget)); e.currentTarget.reset() }}><input name="description" required className="input sm:col-span-2" placeholder="Description" /><input name="category" required defaultValue="general" className="input" aria-label="Category" /><input name="amount" type="number" step="0.01" min="0.01" required className="input" placeholder="Amount" /><button className="btn w-fit">Record expense</button></form>
      {exps.data?.map((e: any) => <div key={e.id} className="flex justify-between text-sm"><span>{e.description} <span className="opacity-60">({e.category})</span></span><span>{Number(e.amount).toLocaleString()}</span></div>)}</section>}</div>)
}
