// Executes a refund with the payment provider after prepare_refund() has validated permission and state.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type, apikey' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'content-type': 'application/json' } })
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { orderId, reason } = await req.json().catch(() => ({}))
  const { data: r, error } = await db.rpc('prepare_refund', { p_order: orderId, p_reason: String(reason ?? '').slice(0, 200) })
  if (error || !r) return json({ error: 'refund not allowed' }, 400)
  const cents = Math.round(Number(r.amount) * 100); let ok = false
  try {
    if (r.provider === 'razorpay' && r.provider_payment_id) {
      const x = await fetch(`https://api.razorpay.com/v1/payments/${r.provider_payment_id}/refund`, { method: 'POST', headers: { authorization: 'Basic ' + btoa(`${Deno.env.get('RAZORPAY_KEY_ID')}:${Deno.env.get('RAZORPAY_KEY_SECRET')}`), 'content-type': 'application/json' }, body: JSON.stringify({ amount: cents }) }); ok = x.ok
    } else if (r.provider === 'stripe') {
      const x = await fetch('https://api.stripe.com/v1/refunds', { method: 'POST', headers: { authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ payment_intent: r.provider_ref }) }); ok = x.ok
    } else if (r.provider === 'mock' && Deno.env.get('PAYMENTS_MODE') !== 'production') ok = true
  } catch { ok = false }
  await admin.from('refunds').update({ status: ok ? 'processed' : 'failed' }).eq('id', r.refund_id)
  if (!ok) return json({ error: 'provider refused the refund' }, 502)
  await admin.from('payments').update({ status: 'refunded' }).eq('id', r.payment_id)
  await admin.from('orders').update({ status: 'refunded' }).eq('id', r.order_id)
  await admin.from('audit_logs').insert({ organization_id: r.organization_id, action: 'refund.processed', entity: 'order', entity_id: r.order_id })
  return json({ status: 'processed' })
})
