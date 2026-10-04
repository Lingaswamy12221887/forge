import { z } from 'zod'
import { supabase } from '../lib/supabase'
const exp = z.object({ description: z.string().min(2).max(200), category: z.string().min(2).max(40), amount: z.coerce.number().positive() })
export const financeService = {
  async invoices() { const { data, error } = await supabase.from('invoices').select('*').order('issued_at', { ascending: false }).limit(100); if (error) throw new Error('Could not load invoices.'); return data ?? [] },
  async expenses() { const { data } = await supabase.from('expenses').select('*').order('incurred_on', { ascending: false }).limit(100); return data ?? [] },
  async invoiceable() { const [o, i] = await Promise.all([supabase.from('orders').select('id,total,currency,status').not('status', 'in', '(pending,cancelled)'), supabase.from('invoices').select('order_id')]); const used = new Set((i.data ?? []).map(x => x.order_id)); return (o.data ?? []).filter(x => !used.has(x.id)) },
  async revenue() { const { data } = await supabase.from('payments').select('amount').eq('status', 'paid'); return (data ?? []).reduce((a, p) => a + Number(p.amount), 0) },
  async createInvoice(orderId: string) { const { error } = await supabase.rpc('create_invoice', { p_order: orderId }); if (error) throw new Error('Could not create the invoice. You need finance access and the order must be confirmed.') },
  async addExpense(orgId: string, input: unknown) { const v = exp.parse(input); const { error } = await supabase.from('expenses').insert({ ...v, organization_id: orgId }); if (error) throw new Error('You need finance access to record expenses.') },
  async refundable() { const { data } = await supabase.from('payments').select('order_id,amount,currency,provider').eq('status', 'paid'); return data ?? [] },
  async refund(orderId: string, reason: string) { const { error } = await supabase.functions.invoke('refund-create', { body: { orderId, reason } }); if (error) throw new Error('The refund could not be completed. Check provider settings and that the order was paid.') },
}
