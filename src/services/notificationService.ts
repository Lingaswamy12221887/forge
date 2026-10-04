import { z } from 'zod'
import { supabase } from '../lib/supabase'
export const prefsSchema = z.object({ email_enabled: z.boolean(), sms_enabled: z.boolean(), phone: z.string().regex(/^\+[1-9][0-9]{7,14}$/, 'Use international format, e.g. +919876543210').nullable() })
export const notificationService = {
  async list() { const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50); if (error) throw new Error('Could not load notifications.'); return data ?? [] },
  async unread() { const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).is('read_at', null); return count ?? 0 },
  async markRead(id: string) { await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id) },
  async markAll() { await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null) },
  async prefs() { const { data } = await supabase.from('notification_preferences').select('*').maybeSingle(); return { email_enabled: data?.email_enabled ?? true, sms_enabled: data?.sms_enabled ?? false, phone: (data?.phone as string | null) ?? null } },
  async savePrefs(userId: string, input: unknown) {
    const v = prefsSchema.parse(input); if (v.sms_enabled && !v.phone) throw new Error('Add a phone number to turn on text messages.')
    const { error } = await supabase.from('notification_preferences').upsert({ user_id: userId, ...v, updated_at: new Date().toISOString() }); if (error) throw new Error('Could not save preferences.')
  },
  subscribe(userId: string, onChange: () => void) {
    const ch = supabase.channel('notif-' + userId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, onChange).subscribe()
    return () => { void supabase.removeChannel(ch) }
  },
}
