import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { trainingService } from '../services/trainingService'

export default function VerifyCertificate() {
  const { code = '' } = useParams()
  const q = useQuery({ queryKey: ['verify', code], queryFn: () => trainingService.verify(code) })

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-900 dark:text-white">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/20 shadow-2xl p-8 md:p-12">
        <div className="space-y-6 text-center md:text-left">
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider">Credential Authentication</span>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">Certificate Verification</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Verifying authenticity and completion records for professional academy credentials.</p>
          </div>

          {q.isLoading ? (
            <div className="p-12 text-center rounded-2xl bg-slate-100 dark:bg-slate-800/40 animate-pulse text-sm text-slate-500">
              Checking cryptographic certificate records…
            </div>
          ) : q.data ? (
            <div className="p-8 rounded-3xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-4 shadow-xl">
              <div className="flex items-center justify-between gap-4 border-b border-emerald-200 dark:border-emerald-900/40 pb-4">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                  ✓ Valid Certificate
                </span>
                <span className="font-mono text-xs text-slate-400">ID: {code.toUpperCase()}</span>
              </div>

              <div className="space-y-2 text-slate-700 dark:text-slate-300">
                <p className="text-lg">
                  Awarded to <strong className="font-bold text-slate-900 dark:text-white">{q.data.holder}</strong>
                </p>
                <p className="text-sm">
                  for successfully completing <strong className="font-bold text-slate-900 dark:text-white">{q.data.course}</strong>
                </p>
              </div>

              <div className="pt-4 border-t border-emerald-200 dark:border-emerald-900/40 flex flex-col sm:flex-row justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                <span>Issued by: <strong className="text-slate-700 dark:text-slate-200">{q.data.issuer}</strong></span>
                <span>Date: {new Date(q.data.issued_at).toLocaleDateString()}</span>
              </div>
            </div>
          ) : (
            <div role="alert" className="p-8 text-center rounded-3xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 space-y-2 shadow-xl">
              <p className="font-bold text-red-600 dark:text-red-400 text-base">Invalid Certificate ID</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No certificate matches “<span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{code}</span>”. Please verify the ID code and try again.
              </p>
            </div>
          )}

          <div className="pt-4 text-center">
            <a href="/" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              ← Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}