// Sends email (EmailJS) and SMS (Twilio) for each new in-app notification.
// Trigger: Supabase Database Webhook on INSERT into public.notifications, with header x-webhook-secret.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const env = (k: string) => Deno.env.get(k)
const safeEq = (a: string, b: string) => { if (!a || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0 }
Deno.serve(async req => {
  if (req.method !== 'POST' || !safeEq(req.headers.get('x-webhook-secret') ?? '', env('NOTIFY_WEBHOOK_SECRET') ?? '')) return new Response('unauthorized', { status: 401 })
  const { record } = await req.json().catch(() => ({})); if (!record?.user_id) return new Response('ignored')
  const admin = createClient(env('SUPABASE_URL')!, env('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: pref } = await admin.from('notification_preferences').select('*').eq('user_id', record.user_id).maybeSingle()
  const wantEmail = pref?.email_enabled ?? true, wantSms = pref?.sms_enabled ?? false
  const result: Record<string, string> = {}
  if (wantEmail && env('EMAILJS_SERVICE_ID') && env('EMAILJS_TEMPLATE_ID') && env('EMAILJS_PUBLIC_KEY') && env('EMAILJS_PRIVATE_KEY')) {
    try {
      const { data: u } = await admin.auth.admin.getUserById(record.user_id)
      if (u.user?.email) {
        const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ service_id: env('EMAILJS_SERVICE_ID'), template_id: env('EMAILJS_TEMPLATE_ID'), user_id: env('EMAILJS_PUBLIC_KEY'), accessToken: env('EMAILJS_PRIVATE_KEY'), template_params: { to_email: u.user.email, title: record.title, message: record.body ?? '' } }) })
        result.email = r.ok ? 'sent' : 'failed'
      }
    } catch { result.email = 'failed' }
  }
  if (wantSms && pref?.phone && env('TWILIO_ACCOUNT_SID') && env('TWILIO_AUTH_TOKEN') && env('TWILIO_FROM_NUMBER')) {
    try {
      const sid = env('TWILIO_ACCOUNT_SID')!
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, { method: 'POST', headers: { authorization: 'Basic ' + btoa(`${sid}:${env('TWILIO_AUTH_TOKEN')}`), 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: pref.phone, From: env('TWILIO_FROM_NUMBER')!, Body: `${record.title}: ${record.body ?? ''}`.slice(0, 300) }) })
      result.sms = r.ok ? 'sent' : 'failed'
    } catch { result.sms = 'failed' }
  }
  return new Response(JSON.stringify(result), { headers: { 'content-type': 'application/json' } })
})
