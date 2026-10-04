import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
const CMDS = [['Go to Overview', '/'], ['Go to Products', '/products'], ['Go to Cart', '/cart'], ['Go to Orders', '/orders'], ['Go to Quotations', '/quotes'], ['Go to Prototyping', '/prototyping'], ['Go to Training', '/training'], ['Go to Support', '/support'], ['Ask AI', 'ai']] as const
export default function CommandPalette() {
  const [open, setOpen] = useState(false); const [q, setQ] = useState(''); const [i, setI] = useState(0); const nav = useNavigate()
  const items = CMDS.filter(c => c[0].toLowerCase().includes(q.toLowerCase()))
  useEffect(() => { const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o); setQ(''); setI(0) } if (e.key === 'Escape') setOpen(false) }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [])
  const run = (t: string) => { setOpen(false); t === 'ai' ? window.dispatchEvent(new Event('forge:open-ai')) : nav(t) }
  if (!open) return null
  return (<div className="fixed inset-0 z-30 flex items-start justify-center bg-black/40 pt-24" onClick={() => setOpen(false)}><div role="dialog" aria-label="Command palette" className="w-full max-w-md rounded-lg bg-paper p-2 text-ink shadow-xl" onClick={e => e.stopPropagation()}>
    <input autoFocus aria-label="Search commands" className="input" placeholder="Type a command" value={q} onChange={e => { setQ(e.target.value); setI(0) }}
      onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(i + 1, items.length - 1)) } if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(i - 1, 0)) } if (e.key === 'Enter' && items[i]) run(items[i][1]) }} />
    <ul className="mt-2" role="listbox">{items.map((c, n) => <li key={c[0]} role="option" aria-selected={n === i}><button className={`w-full rounded px-3 py-2 text-left text-sm ${n === i ? 'bg-signal text-white' : ''}`} onClick={() => run(c[1])}>{c[0]}</button></li>)}{!items.length && <li className="px-3 py-2 text-sm opacity-70">No matching command.</li>}</ul></div></div>)
}
