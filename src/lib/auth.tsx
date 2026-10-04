import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
type Ctx = { session: Session | null; loading: boolean; orgId: string | null; perms: string[]; can: (p: string) => boolean; refresh: () => Promise<void>; signOut: () => Promise<void> }
const AuthCtx = createContext<Ctx>(null as unknown as Ctx)
export const useAuth = () => useContext(AuthCtx)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [perms, setPerms] = useState<string[]>([])
  // UI hint only. Real enforcement is Postgres RLS (has_perm()).
  const load = async (s: Session | null) => {
    if (!s) { setOrgId(null); setPerms([]); return }
    const { data: p } = await supabase.from('profiles').select('organization_id').eq('id', s.user.id).maybeSingle()
    setOrgId(p?.organization_id ?? null)
    const { data } = await supabase.rpc('my_permissions')
    setPerms((data as string[]) ?? [])
  }
  const refresh = async () => load((await supabase.auth.getSession()).data.session)
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => { setSession(data.session); await load(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); void load(s) })
    return () => sub.subscription.unsubscribe()
  }, [])
  return <AuthCtx.Provider value={{ session, loading, orgId, perms, can: p => perms.includes(p), refresh, signOut: async () => { await supabase.auth.signOut() } }}>{children}</AuthCtx.Provider>
}
