import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
export default function Onboarding() {
  const nav = useNavigate(); const { refresh } = useAuth()
  const [name, setName] = useState(''); const [currency, setCurrency] = useState('INR'); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  async function go(e: FormEvent) {
    e.preventDefault(); setBusy(true)
    const { error } = await supabase.rpc('create_organization', { p_name: name, p_currency: currency })
    if (error) { setBusy(false); return setErr('Could not create the organization. Try a different name.') }
    await refresh(); nav('/')
  }
  return (<main className="mx-auto max-w-md p-8"><form onSubmit={go} className="space-y-4">
    <h1 className="font-display text-2xl font-semibold">Set up your organization</h1>
    <label className="block text-sm">Organization name<input className="input mt-1" required minLength={2} value={name} onChange={e => setName(e.target.value)} /></label>
    <label className="block text-sm">Currency<select className="input mt-1" value={currency} onChange={e => setCurrency(e.target.value)}><option>INR</option><option>USD</option><option>EUR</option></select></label>
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    <button className="btn" disabled={busy}>Create organization</button></form></main>)
}
