import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationService } from '../services/notificationService'
import { useAuth } from '../lib/auth'
export default function Notifications() {
  const { session } = useAuth(); const qc = useQueryClient(); const [msg, setMsg] = useState(''); const [err, setErr] = useState('')
  const list = useQuery({ queryKey: ['notifs'], queryFn: notificationService.list })
  const prefs = useQuery({ queryKey: ['prefs'], queryFn: notificationService.prefs })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['notifs'] }); qc.invalidateQueries({ queryKey: ['unread'] }) }
  const read = useMutation({ mutationFn: (id: string) => notificationService.markRead(id), onSuccess: refresh })
  const all = useMutation({ mutationFn: notificationService.markAll, onSuccess: refresh })
  const save = useMutation({ mutationFn: (v: { email_enabled: boolean; sms_enabled: boolean; phone: string | null }) => notificationService.savePrefs(session!.user.id, v), onSuccess: () => { setErr(''); setMsg('Preferences saved.'); qc.invalidateQueries({ queryKey: ['prefs'] }) }, onError: (e: Error) => { setMsg(''); setErr(e.message) } })
  return (<div className="max-w-2xl space-y-4"><div className="flex items-center justify-between"><h1 className="font-display text-2xl font-semibold">Notifications</h1><button className="text-sm underline" onClick={() => all.mutate()}>Mark all as read</button></div>
    {prefs.data && <form key={JSON.stringify(prefs.data)} className="panel grid gap-3 md:grid-cols-3" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); save.mutate({ email_enabled: f.get('email') === 'on', sms_enabled: f.get('sms') === 'on', phone: String(f.get('phone') || '') || null }) }}>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="email" defaultChecked={prefs.data.email_enabled} />Email me</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="sms" defaultChecked={prefs.data.sms_enabled} />Text me</label>
      <input name="phone" className="input" aria-label="Phone number" placeholder="+919876543210" defaultValue={prefs.data.phone ?? ''} />
      <button className="btn w-fit" disabled={save.isPending}>Save preferences</button>{msg && <p className="text-sm md:col-span-2">{msg}</p>}{err && <p role="alert" className="text-sm text-red-600 md:col-span-3">{err}</p>}</form>}
    {list.isLoading ? <div className="panel h-24 animate-pulse" /> : !list.data?.length ? <div className="panel text-sm">You're all caught up. Order, quotation and ticket updates appear here.</div> :
      <ul className="space-y-2">{list.data.map((n: any) => <li key={n.id} className={`panel flex items-start justify-between gap-3 ${n.read_at ? 'opacity-60' : ''}`}><span><span className="font-medium">{n.title}</span><br /><span className="text-sm">{n.body}</span></span>{!n.read_at && <button className="text-sm underline" onClick={() => read.mutate(n.id)}>Mark read</button>}</li>)}</ul>}</div>)
}
