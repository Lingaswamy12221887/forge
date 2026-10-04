import { supabase } from '../lib/supabase'
import type { CartLine } from '../lib/cart'
export const ORDER_FLOW = ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'] as const
export const orderService = {
  async place(lines: CartLine[]) {
    const { data, error } = await supabase.rpc('place_order', { p_items: lines.map(l => ({ product_id: l.product_id, quantity: l.quantity })) })
    if (error) throw new Error('Some items are no longer available in that quantity. Update your cart and try again.')
    return data as string
  },
  async pay(orderId: string, provider: 'razorpay' | 'stripe' | 'mock') {
    const { data, error } = await supabase.functions.invoke('payment-create', { body: { orderId, provider } })
    if (error) throw new Error('Payment could not be started. Your order is saved as pending.')
    return data as { provider: string; mock: boolean; clientSecret?: string; razorpayOrderId?: string }
  },
  async list() {
    const { data, error } = await supabase.from('orders').select('id,status,total,currency,created_at,order_items(quantity,unit_price,products(name))').order('created_at', { ascending: false }).limit(50)
    if (error) throw new Error('Could not load orders.'); return data ?? []
  },
}
