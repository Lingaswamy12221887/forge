import { z } from 'zod'
import { supabase } from '../lib/supabase'
export const STAGES = ['requested', 'review', 'requirements', 'quotation', 'approved', 'design', 'prototype', 'testing', 'revision', 'production', 'delivery', 'completed'] as const
const schema = z.object({ title: z.string().min(3).max(160), description: z.string().max(4000).optional(), budget: z.coerce.number().nonnegative().optional().or(z.literal('').transform(() => undefined)), quantity: z.coerce.number().int().positive().optional().or(z.literal('').transform(() => undefined)), target_date: z.string().optional().transform(v => v || undefined) })
export const prototypeService = {
  async list() { const { data, error } = await supabase.from('prototype_requests').select('*').order('created_at', { ascending: false }).limit(50); if (error) throw new Error('Could not load requests.'); return data ?? [] },
  async create(orgId: string, input: unknown) { const v = schema.parse(input); const { error } = await supabase.from('prototype_requests').insert({ ...v, organization_id: orgId }); if (error) throw new Error('Could not submit your request.') },
  async advance(id: string, to: string) { const { error } = await supabase.rpc('advance_prototype', { p_id: id, p_to: to }); if (error) throw new Error('That stage change is not allowed.') },
  next(cur: string) { if (cur === 'testing') return ['revision', 'production']; if (cur === 'revision') return ['prototype']; const i = STAGES.indexOf(cur as never); return i >= 0 && i < STAGES.length - 1 ? [STAGES[i + 1]] : [] },
}
