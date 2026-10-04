import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { toCsv, download } from '../lib/csv'
import { useAuth } from '../lib/auth'
const REPORTS = [['Orders', 'orders', 'id,status,total,currency,created_at', 'orders.view'], ['Products', 'products', 'sku,name,price,currency,stock,min_stock', 'products.view'], ['Quotations', 'quotations', 'number,status,subtotal,tax_rate,total,valid_until,created_at', 'quotations.view'], ['Support tickets', 'tickets', 'subject,priority,status,created_at', 'tickets.view']] as const
export default function Reports() {
  const { can } = useAuth(); const [busy, setBusy] = useState(''); const [err, setErr] = useState('')
  async function run(name: string, table: string, cols: string) {
    setBusy(table); setErr('')
    const { data, error } = await supabase.from(table).select(cols).limit(5000)
    setBusy(''); if (error || !data?.length) return setErr(error ? 'Could not build the report.' : `No ${name.toLowerCase()} to export yet.`)
    download(`${table}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(data as unknown as Record<string, unknown>[]))
  }
  return (<div className="max-w-2xl space-y-4"><h1 className="font-display text-2xl font-semibold">Reports</h1><p className="text-sm opacity-70">Export data you have access to as CSV. Open in Excel or Google Sheets, or print this page.</p>
    <div className="grid gap-3 sm:grid-cols-2">{REPORTS.map(([n, t, c, perm]) => <div key={t} className="panel flex items-center justify-between"><span>{n}</span><button className="btn" disabled={!can(perm) || busy === t} onClick={() => run(n, t, c)} title={can(perm) ? '' : 'You need access to this data'}>{busy === t ? 'Exporting…' : 'Export CSV'}</button></div>)}</div>
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}<button className="text-sm underline" onClick={() => window.print()}>Print this page</button></div>)
}
