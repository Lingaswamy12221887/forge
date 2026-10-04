import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryService } from '../services/inventoryService'
import { useAuth } from '../lib/auth'
export default function Inventory() {
  const { orgId, can } = useAuth(); const qc = useQueryClient(); const [err, setErr] = useState(''); const manage = can('inventory.manage')
  const sup = useQuery({ queryKey: ['sup'], queryFn: inventoryService.suppliers }), prods = useQuery({ queryKey: ['iprods'], queryFn: inventoryService.products })
  const pos = useQuery({ queryKey: ['pos'], queryFn: inventoryService.orders }), mv = useQuery({ queryKey: ['mv'], queryFn: inventoryService.movements })
  const ok = () => { setErr(''); ['sup', 'iprods', 'pos', 'mv'].forEach(k => qc.invalidateQueries({ queryKey: [k] })) }; const bad = (e: Error) => setErr(e.message)
  const mut = (fn: (f: FormData) => Promise<void>) => useMutation({ mutationFn: fn, onSuccess: ok, onError: bad })
  const addSup = mut(f => inventoryService.addSupplier(orgId!, Object.fromEntries(f))), newPO = mut(f => inventoryService.createPO(orgId!, Object.fromEntries(f))), adj = mut(f => inventoryService.adjust(Object.fromEntries(f)))
  const act = useMutation({ mutationFn: (v: { id: string; a: 'order' | 'receive' }) => v.a === 'order' ? inventoryService.markOrdered(v.id) : inventoryService.receive(v.id), onSuccess: ok, onError: bad })
  const submit = (m: { mutate: (f: FormData) => void }) => (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); m.mutate(new FormData(e.currentTarget)); e.currentTarget.reset() }
  const low = prods.data?.filter((p: any) => p.stock <= p.min_stock) ?? []
  return (<div className="max-w-4xl space-y-6"><h1 className="font-display text-2xl font-semibold">Inventory and procurement</h1>
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    {low.length > 0 && <div className="panel border-amber text-sm"><strong>Low stock:</strong> {low.map((p: any) => `${p.name} (${p.stock})`).join(', ')}</div>}
    {manage && <div className="grid gap-4 md:grid-cols-3">
      <form onSubmit={submit(addSup)} className="panel space-y-2"><h2 className="font-medium">Add supplier</h2><input name="name" required className="input" placeholder="Name" /><input name="email" type="email" className="input" placeholder="Email" /><button className="btn">Add</button></form>
      <form onSubmit={submit(newPO)} className="panel space-y-2"><h2 className="font-medium">New purchase order</h2><select name="supplier_id" required className="input" aria-label="Supplier"><option value="">Supplier</option>{sup.data?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <select name="product_id" required className="input" aria-label="Product"><option value="">Product</option>{prods.data?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <div className="flex gap-2"><input name="quantity" type="number" min="1" required className="input" placeholder="Qty" /><input name="unit_cost" type="number" step="0.01" min="0" required className="input" placeholder="Unit cost" /></div><button className="btn">Create</button></form>
      <form onSubmit={submit(adj)} className="panel space-y-2"><h2 className="font-medium">Adjust stock</h2><select name="product" required className="input" aria-label="Product"><option value="">Product</option>{prods.data?.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.stock})</option>)}</select>
        <input name="delta" type="number" required className="input" placeholder="Change, e.g. -3 or 10" /><input name="note" required minLength={2} className="input" placeholder="Reason" /><button className="btn">Apply</button></form></div>}
    <section className="space-y-2"><h2 className="font-medium">Purchase orders</h2>{!pos.data?.length ? <div className="panel text-sm">No purchase orders yet.</div> : pos.data.map((o: any) => <div key={o.id} className="panel flex flex-wrap items-center justify-between gap-2 text-sm">
      <span><strong>{o.number}</strong> · {o.suppliers?.name}<br /><span className="opacity-70">{o.purchase_order_items.map((i: any) => `${i.quantity}× ${i.products?.name}`).join(', ')}</span></span>
      <span className="flex items-center gap-2"><span className="capitalize">{o.status}</span>{manage && o.status === 'draft' && <button className="btn" onClick={() => act.mutate({ id: o.id, a: 'order' })}>Mark ordered</button>}{manage && o.status === 'ordered' && <button className="btn" onClick={() => act.mutate({ id: o.id, a: 'receive' })}>Receive goods</button>}</span></div>)}</section>
    <section className="space-y-1"><h2 className="font-medium">Stock movements</h2>{!mv.data?.length ? <p className="text-sm opacity-70">No movements yet.</p> : mv.data.map((m: any) => <p key={m.id} className="flex justify-between text-sm"><span>{m.products?.name} <span className="opacity-60">· {m.reason.replace('_', ' ')} {m.ref}</span></span><span className={m.delta > 0 ? 'text-signal' : 'text-red-600'}>{m.delta > 0 ? '+' : ''}{m.delta}</span></p>)}</section></div>)
}
