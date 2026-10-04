import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isConfigured } from '../lib/supabase'

export default function Login() {
  const nav = useNavigate()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    setNote('')
    const r = mode === 'in' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (r.error) return setErr(mode === 'in' ? 'Email or password is incorrect.' : r.error.message)
    if (mode === 'up' && !r.data.session) return setNote('Check your email to verify your account, then sign in.')
    nav('/')
  }

  return (
    <main className="relative grid min-h-screen md:grid-cols-2 overflow-hidden bg-slate-950">
      {/* Background with High-End Tech Imagery & Overlay */}
      <div className="absolute inset-0 z-0 opacity-40 mix-blend-luminosity bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=2000')` }} />
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/80 to-indigo-950/50 z-0" />

      {/* Left Promotional Panel with 3D Float Cards */}
      <section className="relative z-10 hidden flex-col justify-between p-12 text-white md:flex">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center shadow-lg shadow-indigo-500/30 transform hover:rotate-12 transition-transform duration-300">
            <span className="font-bold text-lg">F</span>
          </div>
          <span className="font-display text-2xl font-bold tracking-wider">Forge</span>
        </div>
        
        <div className="space-y-6 my-auto">
          <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium uppercase tracking-widest text-teal-300 animate-pulse">
            Next-Gen Hardware Workspace
          </div>
          <h1 className="max-w-md font-display text-5xl font-extrabold leading-tight tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            From sensor to shipped product, in one workspace.
          </h1>
          <p className="text-slate-300 text-base leading-relaxed max-w-sm">
            Catalog, prototyping, quotes and training for elite hardware engineering teams.
          </p>
          
          {/* 3D Floating Feature Preview Card */}
          <div className="transform hover:-translate-y-2 transition-transform duration-500 p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl max-w-sm">
            <div className="flex items-center gap-4 mb-3">
              <img src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=200" alt="Tech" className="w-12 h-12 rounded-lg object-cover border border-white/20" />
              <div>
                <h4 className="font-semibold text-sm text-white">Live PCB Telemetry</h4>
                <p className="text-xs text-slate-400">Real-time embedded diagnostics</p>
              </div>
            </div>
            <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-teal-400 to-indigo-500 h-full w-4/5 rounded-full animate-pulse" />
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">© 2026 Forge Platform Inc. All rights reserved.</p>
      </section>

      {/* Right Authentication Form with Frosted Glassmorphism */}
      <section className="relative z-10 flex items-center justify-center p-8 backdrop-blur-sm">
        <div className="w-full max-w-md p-8 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/20 dark:border-slate-800 shadow-2xl shadow-indigo-950/20 transform transition-all">
          <form onSubmit={submit} className="space-y-5" aria-label="Authentication">
            <div className="space-y-2 text-center md:text-left">
              <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">
                {mode === 'in' ? 'Welcome back' : 'Create account'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {mode === 'in' ? 'Enter your credentials to access your workspace' : 'Get started with your collaborative hardware suite'}
              </p>
            </div>

            {!isConfigured && (
              <div role="alert" className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs">
                Supabase isn't configured. Copy .env.example to .env and add your project keys.
              </div>
            )}

            <div className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Email Address
                <input className="input mt-1.5 w-full rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Password
                <input className="input mt-1.5 w-full rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all" type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              </label>
            </div>

            {err && <p role="alert" className="text-sm text-red-500 font-medium bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-900">{err}</p>}
            {note && <p className="text-sm text-teal-600 dark:text-teal-400 font-medium bg-teal-50 dark:bg-teal-950/30 p-3 rounded-lg border border-teal-200 dark:border-teal-900">{note}</p>}

            <button className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-500 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transform hover:-translate-y-0.5 transition-all disabled:opacity-50" disabled={busy}>
              {busy ? 'Working…' : mode === 'in' ? 'Sign In to Workspace' : 'Create Account'}
            </button>

            <div className="text-center pt-2">
              <button type="button" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
                {mode === 'in' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}