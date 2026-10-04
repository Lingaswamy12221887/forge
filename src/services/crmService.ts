import { z } from 'zod'
import { supabase } from '../lib/supabase'
export const LEAD_STAGES = ['lead', 'qualified', 'contacted', 'proposal', 'negotiation', 'won', 'lost'] as const
export type LeadStage = typeof LEAD_STAGES[number]
export const leadSchema = z.object({ name: z.string().min(2).max(120), company: z.string().max(120).optional(), email: z.string().email().optional().or(z.literal('').transform(() => undefined)), value: z.coerce.number().nonnegative().default(0) })
export const crmService = {
  async list() { const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(300); if (error) throw new Error('Could not load leads.'); return data ?? [] },
  async create(orgId: string, input: unknown) { const v = leadSchema.parse(input); const { error } = await supabase.from('leads').insert({ ...v, organization_id: orgId }); if (error) throw new Error('You need CRM access to add leads.') },
  async setStage(id: string, stage: LeadStage) { const { error } = await supabase.from('leads').update({ stage }).eq('id', id); if (error) throw new Error('Could not move the lead.') },
}
