import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send } from 'lucide-react'
import { aiService, AIMsg, AIProposal } from '../services/aiService'
import { runAction, isKnownAction, ACTIONS } from '../services/actionService'
import { useAuth } from '../lib/auth'
type Msg = AIMsg & { proposal?: AIProposal; outcome?: string }
const SUGGESTED = ['Which products are low in stock?', "Summarize this month's orders", 'Open a support ticket about a delayed order']
export default function AIChat() {
  const { orgId } = useAuth(); const [open, setOpen] = useState(false); const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState('')
  const [cid, setCid] = useState<string>(); const [ctx, setCtx] = useState<{ type: string; id?: string; label?: string }>(); const [busy, setBusy] = useState(false); const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView() }, [msgs, open])
  useEffect(() => { const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'j') { e.preventDefault(); setOpen(o => !o) } }; const o = (e: Event) => { setOpen(true); const d = (e as CustomEvent).detail; if (d) { setCtx(d); setCid(undefined); setMsgs([]) } }; window.addEventListener('keydown', k); window.addEventListener('forge:open-ai', o); return () => { window.removeEventListener('keydown', k); window.removeEventListener('forge:open-ai', o) } }, [])
  async function send(t: string) {
    if (!t.trim() || busy) return
    const next: Msg[] = [...msgs, { role: 'user', content: t }]; setMsgs(next); setText(''); setBusy(true)
    try { const r = await aiService.chat(next.map(({ role, content }) => ({ role, content })), cid, ctx && { type: ctx.type, id: ctx.id }); setCid(r.conversationId); setMsgs([...next, { role: 'assistant', content: r.reply, proposal: r.proposal }]) }
    catch (e) { setMsgs([...next, { role: 'assistant', content: (e as Error).message }]) } finally { setBusy(false) }
  }
  async function decide(i: number, ok: boolean) {
    const p = msgs[i].proposal!; const set = (outcome: string) => setMsgs(m => m.map((x, j) => j === i ? { ...x, outcome } : x))
    if (!ok) return set('Cancelled. Nothing was changed.')
    try { await runAction(p, orgId!); set('Done.') } catch (e) { set((e as Error).message) }
  }
  if (!open) return <button aria-label="Open AI assistant (Ctrl+J)" onClick={() => setOpen(true)} className="btn fixed bottom-5 right-5 rounded-full shadow-lg"><Sparkles size={16} />Ask AI</button>
  return (<aside aria-label="AI assistant" className="fixed bottom-5 right-5 z-20 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-black/15 bg-paper text-ink shadow-xl">
    <header className="flex items-center justify-between border-b border-black/10 p-3"><span className="font-medium">Forge Copilot</span><button aria-label="Close" onClick={() => setOpen(false)}><X size={16} /></button></header>
    {ctx && <p className="border-b border-black/10 px-3 py-1 text-xs">Context: {ctx.label ?? ctx.type} · <button className="underline" onClick={() => { setCtx(undefined); setCid(undefined) }}>clear</button></p>}
    <div className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">{!msgs.length && <div className="space-y-2"><p className="opacity-70">Ask about your catalog, orders or customers. I'll ask before taking any action.</p>
      {SUGGESTED.map(s => <button key={s} onClick={() => send(s)} className="block w-full rounded-md border border-black/10 px-3 py-2 text-left hover:bg-black/5">{s}</button>)}</div>}
      {msgs.map((m, i) => <div key={i} className={m.role === 'user' ? 'ml-8' : 'mr-8'}><p className={`whitespace-pre-wrap rounded-md p-2 ${m.role === 'user' ? 'bg-signal text-white' : 'bg-black/5'}`}>{m.content}</p>
        {m.proposal && isKnownAction(m.proposal.action) && <div className="mt-2 rounded-md border border-amber p-2"><p className="font-medium">{ACTIONS[m.proposal.action].label}?</p><p>{m.proposal.summary}</p>
          {m.outcome ? <p className="mt-1 opacity-70">{m.outcome}</p> : <div className="mt-2 flex gap-2"><button className="btn" onClick={() => decide(i, true)}>Confirm</button><button className="rounded-md border border-black/20 px-3 py-2" onClick={() => decide(i, false)}>Cancel</button></div>}</div>}</div>)}
      {busy && <p className="opacity-60">Thinking…</p>}<div ref={end} /></div>
    <form onSubmit={e => { e.preventDefault(); send(text) }} className="flex gap-2 border-t border-black/10 p-3"><input aria-label="Message" className="input" value={text} onChange={e => setText(e.target.value)} placeholder="Ask anything" /><button className="btn px-3" aria-label="Send" disabled={busy}><Send size={16} /></button></form></aside>)
}
