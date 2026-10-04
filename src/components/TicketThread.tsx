import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
export default function TicketThread({ id }: { id: string }) {
  const { can, session } = useAuth(); const qc = useQueryClient(); const [err, setErr] = useState('')
  const q = useQuery({ queryKey: ['tmsgs', id], queryFn: async () => (await supabase.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at')).data ?? [] })
  const send = useMutation({ mutationFn: async (v: { body: string; internal: boolean }) => { const body = z.string().min(1).max(5000).parse(v.body.trim()); const { error } = await supabase.from('ticket_messages').insert({ ticket_id: id, body, internal: v.internal }); if (error) throw new Error('Could not send your reply.') },
    onSuccess: () => { setErr(''); qc.invalidateQueries({ queryKey: ['tmsgs', id] }) }, onError: (e: Error) => setErr(e.message) })
  return (<div className="mt-3 space-y-2 border-t border-black/10 pt-3">{q.data?.map((m: any) => <p key={m.id} className={`rounded-md p-2 text-sm ${m.internal ? 'border border-amber' : m.author_id === session?.user.id ? 'ml-8 bg-signal text-white' : 'mr-8 bg-black/5'}`}>{m.internal && <strong>Internal note · </strong>}{m.body}</p>)}
    <form className="flex flex-wrap items-center gap-2" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); const body = String(f.get('b') ?? ''); if (body.trim()) send.mutate({ body, internal: f.get('i') === 'on' }); e.currentTarget.reset() }}>
      <input name="b" aria-label="Reply" className="input flex-1" placeholder="Write a reply" />{can('tickets.manage') && <label className="text-sm"><input type="checkbox" name="i" /> Internal note</label>}<button className="btn">Send</button></form>
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}</div>)
}
