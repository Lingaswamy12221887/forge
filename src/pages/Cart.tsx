import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../lib/cart'
import { orderService } from '../services/orderService'

export default function Cart() {
  const { lines, setQty, clear } = useCart()
  const nav = useNavigate()
  const [provider, setProvider] = useState<'razorpay' | 'stripe' | 'mock'>('mock')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const total = lines.reduce((a, l) => a + l.price * l.quantity, 0)

  async function checkout() {
    setBusy(true)
    setErr('')
    try {
      const id = await orderService.place(lines)
      clear()
      try { await orderService.pay(id, provider) } catch { /* order stays pending */ }
      nav('/orders')
    } catch (e) {
      setErr((e as Error).message)
      setBusy(false)
    }
  }

  if (!lines.length) return (
    <div className="max-w-xl mx-auto mt-24 text-center p-12 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
      <img src="https://images.unsplash.com/photo-1557821552-17105176674c?auto=format&fit=crop&q=80&w=200" alt="Empty Cart" className="w-24 h-24 mx-auto rounded-2xl object-cover shadow-md opacity-70" />
      <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Your cart is empty</h2>
      <p className="text-sm text-slate-500">Explore our hardware catalog and add components to start assembling your purchase order.</p>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">Checkout Workspace</h1>
        <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold text-xs">{lines.length} Items</span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Items List */}
        <div className="md:col-span-2 p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">Selected Components</h2>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 space-y-4">
            {lines.map(l => (
              <li key={l.product_id} className="flex items-center justify-between gap-4 pt-4 first:pt-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-teal-500/20 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400">
                    {l.name[0]}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">{l.name}</h4>
                    <span className="text-xs text-slate-500">{l.currency} {l.price.toLocaleString()} each</span>
                  </div>
                </div>
                <input aria-label={`Quantity for ${l.name}`} type="number" min={0} className="w-20 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 text-center text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500" value={l.quantity} onChange={e => setQty(l.product_id, Number(e.target.value))} />
              </li>
            ))}
          </ul>
        </div>

        {/* Order Summary & Payment Gateway Selector */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-2xl space-y-6 flex flex-col justify-between border border-white/10">
          <div className="space-y-4">
            <h2 className="font-display text-lg font-bold border-b border-white/10 pb-3">Payment & Total</h2>
            
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Payment Gateway
              <select className="mt-1.5 w-full rounded-xl bg-slate-800 border border-slate-700 p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500" value={provider} onChange={e => setProvider(e.target.value as never)}>
                <option value="razorpay">Razorpay (India)</option>
                <option value="stripe">Stripe (International)</option>
                <option value="mock">Test Payment (Dev)</option>
              </select>
            </label>

            <div className="pt-2">
              <p className="text-xs text-slate-400 uppercase tracking-widest">Total Amount Due</p>
              <p className="font-display text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-indigo-300">
                {lines[0]?.currency || 'INR'} {total.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">Final price and inventory levels are securely re-checked on the server upon order placement.</p>
            {err && <p role="alert" className="text-xs text-red-400 font-medium bg-red-950/50 p-3 rounded-xl border border-red-900">{err}</p>}
            <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-400 to-indigo-500 text-slate-950 font-bold shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 transform hover:-translate-y-0.5 transition-all disabled:opacity-50" onClick={checkout} disabled={busy}>
              {busy ? 'Processing Order…' : 'Place Order Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}