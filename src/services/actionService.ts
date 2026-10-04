import { z } from 'zod'
import { supabase } from '../lib/supabase'
import { ticketService } from './ticketService'
import type { AIProposal } from './aiService'
// Allow-listed actions. The AI only PROPOSES; the user confirms; execution uses the user's own session,
// so RLS/RBAC in Postgres still decides whether it succeeds.
export const ACTIONS = {
  cancel_order: { destructive: true, label: 'Cancel order', schema: z.object({ order_id: z.string().uuid() }),
    run: async (p: { order_id: string }) => { const { error } = await supabase.rpc('cancel_order', { p_id: p.order_id }); if (error) throw new Error('This order cannot be cancelled. It may be paid, already shipped, or you lack permission.') } },
  create_ticket: { destructive: false, label: 'Create ticket', schema: z.object({ subject: z.string().min(3).max(160), body: z.string().min(1).max(5000), priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal') }),
    run: async (p: { subject: string; body: string; priority: string }, orgId: string) => { await ticketService.create(orgId, p) } },
} as const
export type ActionName = keyof typeof ACTIONS
export const isKnownAction = (a: string): a is ActionName => Object.prototype.hasOwnProperty.call(ACTIONS, a)
export async function runAction(proposal: AIProposal, orgId: string) {
  if (!isKnownAction(proposal.action)) throw new Error('Unknown action.')
  const def = ACTIONS[proposal.action]; const params = def.schema.parse(proposal.params)
  await (def.run as (p: unknown, o: string) => Promise<void>)(params, orgId)
  const { data } = await supabase.auth.getUser()
  await supabase.from('audit_logs').insert({ organization_id: orgId, user_id: data.user?.id, action: 'ai.action.confirmed', entity: proposal.action, metadata: params })
}
