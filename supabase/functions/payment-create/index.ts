// Creates a payment with the configured provider. Amount is read from the DB, never from the client.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type, apikey' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'content-type': 'application/json' } })
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: u } = await db.auth.getUser(); if (!u.user) return json({ error: 'unauthorized' }, 401)
  const { orderId, provider } = await req.json()
  const { data: order } = await db.from('orders').select('id,organization_id,total,currency,status').eq('id', orderId).maybeSingle() // RLS: caller must see it
  if (!order || order.status !== 'pending') return json({ error: 'order not payable' }, 400)
  const amount = Math.round(Number(order.total) * 100), cur = String(order.currency).toLowerCase()
  const prod = Deno.env.get('PAYMENTS_MODE') === 'production'
  let ref = '', client: Record<string, unknown> = {}
  try {
    if (provider === 'razorpay') {
      const r = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { authorization: 'Basic ' + btoa(`${Deno.env.get('RAZORPAY_KEY_ID')}:${Deno.env.get('RAZORPAY_KEY_SECRET')}`), 'content-type': 'application/json' }, body: JSON.stringify({ amount, currency: order.currency, receipt: order.id }) })
      if (!r.ok) throw 0; const j = await r.json(); ref = j.id; client = { razorpayOrderId: j.id, keyId: Deno.env.get('RAZORPAY_KEY_ID'), amount }
    } else if (provider === 'stripe') {
      const r = await fetch('https://api.stripe.com/v1/payment_intents', { method: 'POST', headers: { authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ amount: String(amount), currency: cur, 'metadata[order_id]': order.id }) })
      if (!r.ok) throw 0; const j = await r.json(); ref = j.id; client = { clientSecret: j.client_secret }
    } else if (provider === 'mock' && !prod) {
      ref = 'mock_' + crypto.randomUUID()
    } else return json({ error: 'provider unavailable' }, 400)
  } catch { return json({ error: 'payment provider error' }, 502) }
  const mock = provider === 'mock'
  await admin.from('payments').insert({ organization_id: order.organization_id, order_id: order.id, provider, provider_ref: ref, amount: order.total, currency: order.currency, status: mock ? 'paid' : 'pending' })
  if (mock) await admin.from('orders').update({ status: 'confirmed' }).eq('id', order.id)
  return json({ provider, ref, mock, ...client })
  // TODO(webhook): confirm real payments via signed Razorpay/Stripe webhooks before setting orders to 'confirmed'.
})
