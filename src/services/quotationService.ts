import { z } from 'zod'
import { supabase } from '../lib/supabase'
const line = z.object({ description: z.string().min(2).max(300), quantity: z.coerce.number().positive(), unit_price: z.coerce.number().nonnegative() })
const schema = z.object({ customer_id: z.string().uuid(), tax_rate: z.coerce.number().min(0).max(100), valid_until: z.string().optional(), lines: z.array(line).min(1).max(50) })
export const quotationService = {
  async list() { const { data, error } = await supabase.from('quotations').select('*, customers(name), quotation_items(description,quantity,unit_price)').order('created_at', { ascending: false }).limit(50); if (error) throw new Error('Could not load quotations.'); return data ?? [] },
  async customers() { const { data } = await supabase.from('customers').select('id,name').order('name'); return data ?? [] },
  async create(orgId: string, input: unknown) {
    const v = schema.parse(input)
    const { data, error } = await supabase.from('quotations').insert({ organization_id: orgId, customer_id: v.customer_id, tax_rate: v.tax_rate, valid_until: v.valid_until || null, number: 'Q-' + Date.now().toString(36).toUpperCase() }).select('id').single()
    if (error) throw new Error('Could not create the quotation.')
    const { error: e2 } = await supabase.from('quotation_items').insert(v.lines.map(l => ({ ...l, quotation_id: data.id })))
    if (e2) throw new Error('Quotation saved, but line items failed. Open it and add them again.')
  },
  async setStatus(id: string, status: 'sent') { const { error } = await supabase.from('quotations').update({ status }).eq('id', id); if (error) throw new Error('Could not update the quotation.') },
  async respond(id: string, accept: boolean) { const { error } = await supabase.rpc('respond_quotation', { p_id: id, p_accept: accept }); if (error) throw new Error('This quotation can no longer be answered. It may have expired.') },
}
