import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface Order {
  id: string
  status: string
  total: number
  created_at: string
}

async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export default function Orders() {
  const { data: orders = [], isLoading, error } = useQuery({ queryKey: ['orders'], queryFn: fetchOrders })

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-2xl border border-white/10">
        <div className="relative z-10 space-y-2">
          <span className="px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold uppercase tracking-wider">Transaction Pipeline</span>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">Order Lifecycle Hub</h1>
          <p className="text-slate-300 text-sm max-w-md">Track, audit, and verify customer procurement milestones from checkout to fulfillment.</p>
        </div>
      </div>

      {/* Orders Table Panel */}
      <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="h-48 animate-pulse bg-slate-800/20 rounded-2xl" />
        ) : error ? (
          <p className="text-red-500 text-sm">Failed to retrieve transaction pipeline records.</p>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=150" alt="" className="w-16 h-16 mx-auto opacity-40 rounded-2xl object-cover" />
            <p className="text-slate-500 text-sm">No orders recorded yet. Completed checkouts will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase text-xs tracking-wider">
                  <th className="pb-4">Order ID</th>
                  <th className="pb-4">Date Placed</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">{o.id.slice(0, 8)}…</td>
                    <td className="py-4 text-slate-600 dark:text-slate-300">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${o.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-4 text-right font-display font-extrabold text-slate-900 dark:text-white">₹ {Number(o.total).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}