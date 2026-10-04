import { z } from 'zod'
import { supabase } from '../lib/supabase'
export const adjustSchema = z.object({ product: z.string().uuid(), delta: z.coerce.number().int().refine(n => n !== 0, 'Enter a non-zero change'), note: z.string().min(2).max(120) })
const po = z.object({ supplier_id: z.string().uuid(), product_id: z.string().uuid(), quantity: z.coerce.number().int().positive(), unit_cost: z.coerce.number().nonnegative() })
const sup = z.object({ name: z.string().min(2).max(120), email: z.string().email().optional().or(z.literal('').transform(() => undefined)) })
export const inventoryService = {
  async suppliers() { const { data } = await supabase.from('suppliers').select('*').order('name'); return data ?? [] },
  async products() { const { data } = await supabase.from('products').select('id,name,sku,stock,min_stock').is('deleted_at', null).order('name'); return data ?? [] },
  async orders() { const { data, error } = await supabase.from('purchase_orders').select('*, suppliers(name), purchase_order_items(quantity,unit_cost,products(name))').order('created_at', { ascending: false }).limit(50); if (error) throw new Error('Could not load purchase orders.'); return data ?? [] },
  async movements() { const { data } = await supabase.from('inventory_movements').select('*, products(name)').order('created_at', { ascending: false }).limit(50); return data ?? [] },
  async addSupplier(orgId: string, input: unknown) { const v = sup.parse(input); const { error } = await supabase.from('suppliers').insert({ ...v, organization_id: orgId }); if (error) throw new Error('You need inventory access to add suppliers.') },
  async createPO(orgId: string, input: unknown) {
    const v = po.parse(input)
    const { data, error } = await supabase.from('purchase_orders').insert({ organization_id: orgId, supplier_id: v.supplier_id, number: 'PO-' + Date.now().toString(36).toUpperCase() }).select('id').single()
    if (error) throw new Error('Could not create the purchase order.')
    const { error: e2 } = await supabase.from('purchase_order_items').insert({ po_id: data.id, product_id: v.product_id, quantity: v.quantity, unit_cost: v.unit_cost }); if (e2) throw new Error('Order created without its item. Delete it and try again.')
  },
  async markOrdered(id: string) { const { error } = await supabase.from('purchase_orders').update({ status: 'ordered' }).eq('id', id).eq('status', 'draft'); if (error) throw new Error('Could not update the order.') },
  async receive(id: string) { const { error } = await supabase.rpc('receive_purchase_order', { p_id: id }); if (error) throw new Error('This order cannot be received. It must be in the ordered state.') },
  async adjust(input: unknown) { const v = adjustSchema.parse(input); const { error } = await supabase.rpc('adjust_stock', { p_product: v.product, p_delta: v.delta, p_note: v.note }); if (error) throw new Error('Adjustment failed. Stock cannot go below zero.') },
}
