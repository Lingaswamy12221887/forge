// Confirms REAL payments. Verifies provider signatures, checks amount, idempotent. Deploy with --no-verify-jwt.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const enc = new TextEncoder()
async function hmac(secret: string, data: string) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(data)))].map(b => b.toString(16).padStart(2, '0')).join('')
}
const safeEq = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0 }
Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })
  const provider = new URL(req.url).searchParams.get('provider'); const body = await req.text()
  let ref = '', paid = 0, ok = false, payId = ''
  try {
    const evt = JSON.parse(body)
    if (provider === 'razorpay') {
      const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET'); if (!secret) return new Response('not configured', { status: 500 })
      if (!safeEq(await hmac(secret, body), req.headers.get('x-razorpay-signature') ?? '')) return new Response('bad signature', { status: 400 })
      if (evt.event === 'payment.captured') { const e = evt.payload.payment.entity; ref = e.order_id; paid = e.amount; payId = e.id; ok = true }
    } else if (provider === 'stripe') {
      const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET'); if (!secret) return new Response('not configured', { status: 500 })
      const parts = Object.fromEntries((req.headers.get('stripe-signature') ?? '').split(',').map(p => p.split('=')))
      if (!parts.t || Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return new Response('stale', { status: 400 })
      if (!safeEq(await hmac(secret, `${parts.t}.${body}`), parts.v1 ?? '')) return new Response('bad signature', { status: 400 })
      if (evt.type === 'payment_intent.succeeded') { const o = evt.data.object; ref = o.id; paid = o.amount_received; ok = true }
    } else return new Response('unknown provider', { status: 400 })
  } catch { return new Response('bad payload', { status: 400 }) }
  if (!ok) return new Response('ignored', { status: 200 })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: pay } = await admin.from('payments').select('id,order_id,amount,status,organization_id').eq('provider', provider).eq('provider_ref', ref).maybeSingle()
  if (!pay) return new Response('unknown payment', { status: 200 })
  if (pay.status === 'paid') return new Response('already processed', { status: 200 })
  if (Math.round(Number(pay.amount) * 100) !== paid) { await admin.from('audit_logs').insert({ organization_id: pay.organization_id, user_id: null, action: 'payment.amount_mismatch', entity: 'payment', entity_id: pay.id }); return new Response('amount mismatch', { status: 400 }) }
  await admin.from('payments').update({ status: 'paid', provider_payment_id: payId || null }).eq('id', pay.id).eq('status', 'pending')
  await admin.from('orders').update({ status: 'confirmed' }).eq('id', pay.order_id).eq('status', 'pending')
  await admin.from('audit_logs').insert({ organization_id: pay.organization_id, user_id: null, action: 'payment.confirmed', entity: 'payment', entity_id: pay.id })
  return new Response('ok')
})
