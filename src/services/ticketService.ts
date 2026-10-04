import { z } from 'zod'
import { supabase } from '../lib/supabase'
const schema = z.object({ subject: z.string().min(3).max(160), body: z.string().min(1).max(5000), priority: z.enum(['low', 'normal', 'high', 'urgent']) })
export const ticketService = {
  async list() { const { data, error } = await supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(50); if (error) throw new Error('Could not load tickets.'); return data ?? [] },
  async create(orgId: string, input: unknown) {
    const v = schema.parse(input)
    const { data, error } = await supabase.from('tickets').insert({ organization_id: orgId, subject: v.subject, priority: v.priority }).select('id').single()
    if (error) throw new Error('Could not create the ticket.')
    await supabase.from('ticket_messages').insert({ ticket_id: data.id, body: v.body })
  },
  async setStatus(id: string, status: string) { const { error } = await supabase.from('tickets').update({ status }).eq('id', id); if (error) throw new Error('You cannot change this ticket.') },
}
