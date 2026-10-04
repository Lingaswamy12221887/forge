import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

async function stats() {
  const c = (t: string) => supabase.from(t).select('*', { count: 'exact', head: true }).then(r => r.count ?? 0)
  const [products, customers, orders] = await Promise.all([c('products'), c('customers'), c('orders')])
  const { data: lows } = await supabase.from('products').select('name,stock,min_stock').is('deleted_at', null).order('stock').limit(5)
  const { data: ord } = await supabase.from('orders').select('status,total')
  const byStatus: Record<string, number> = {}; (ord ?? []).forEach(o => { byStatus[o.status] = (byStatus[o.status] ?? 0) + 1 })
  const revenue = (ord ?? []).reduce((a, o) => a + Number(o.total), 0)
  return { products, customers, orders, revenue, lows: (lows ?? []).filter(p => p.stock <= p.min_stock), chart: Object.entries(byStatus).map(([status, n]) => ({ status, n })) }
}

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['dash'], queryFn: stats })

  if (isLoading) return (
    <div className="space-y-6 p-8">
      <div className="grid gap-6 md:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="panel h-32 animate-pulse rounded-2xl bg-white/40 dark:bg-slate-800/40 backdrop-blur-md" />)}</div>
    </div>
  )

  if (error || !data) return (
    <div className="panel max-w-md mx-auto mt-20 p-8 rounded-3xl text-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl border border-red-200">
      <p className="text-slate-700 dark:text-slate-300 mb-4">Couldn't load the dashboard analytics.</p>
      <button className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium shadow-lg hover:bg-indigo-700 transition" onClick={() => refetch()}>Retry Connection</button>
    </div>
  )

  const kpis = [
    ['Total Revenue', `₹ ${data.revenue.toLocaleString()}`, 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=150', 'from-emerald-500/10 to-teal-500/10'],
    ['Active Orders', data.orders, 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=150', 'from-indigo-500/10 to-blue-500/10'],
    ['Total Customers', data.customers, 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=150', 'from-purple-500/10 to-pink-500/10'],
    ['Catalog Products', data.products, 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=150', 'from-amber-500/10 to-orange-500/10']
  ]

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header Banner with Online Thumbnail */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-2xl border border-white/10">
        <div className="absolute -right-10 -bottom-10 opacity-20 pointer-events-none">
          <img src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=600" alt="Hero background tech" className="w-96 h-96 object-cover rounded-full filter blur-sm" />
        </div>
        <div className="relative z-10 max-w-xl space-y-2">
          <span className="px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold uppercase tracking-wider">Live System Overview</span>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">Executive Workspace</h1>
          <p className="text-slate-300 text-sm">Monitor core KPIs, inventory velocity, and order lifecycle performance in real-time.</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-6 md:grid-cols-4">
        {kpis.map(([k, v, img, bgGradient], idx) => (
          <div key={k as string} className={`relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br ${bgGradient} bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none transform hover:-translate-y-1 transition-all duration-300 group`}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{k}</p>
              <img src={img as string} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/20 shadow-sm group-hover:scale-110 transition-transform duration-300" />
            </div>
            <p className="font-display text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{v}</p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ))}
      </div>

      {/* Charts & Low Stock Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xl">
          <h2 className="mb-4 font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping" />
            Orders by Status
          </h2>
          {data.chart.length ? (
            <div className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chart}>
                  <XAxis dataKey="status" fontSize={11} stroke="#64748b" tickLine={false} />
                  <YAxis allowDecimals={false} fontSize={11} stroke="#64748b" tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem', color: '#fff' }} />
                  <Bar dataKey="n" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" />
                      <stop offset="100%" stopColor="#0d9488" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-center text-slate-400 text-sm">
              <img src="https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&q=80&w=150" alt="" className="w-16 h-16 opacity-40 mb-3 rounded-2xl object-cover" />
              No orders checked out yet. Orders appear here once customers place items in their cart.
            </div>
          )}
        </div>

        <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="mb-4 font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              Low Stock Alerts
            </h2>
            {data.lows.length ? (
              <ul className="space-y-3">
                {data.lows.map(p => (
                  <li key={p.name} className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-sm">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</span>
                    <span className="px-3 py-1 rounded-full bg-amber-500 text-white font-bold text-xs shadow-sm">{p.stock} left</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-center text-slate-400 text-sm">
                <img src="https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&q=80&w=150" alt="" className="w-16 h-16 opacity-40 mb-3 rounded-2xl object-cover" />
                All active inventory items are well above their minimum stock thresholds.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}