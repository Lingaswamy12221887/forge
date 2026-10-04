import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentService } from '../services/documentService'
import { useAuth } from '../lib/auth'
export default function Documents() {
  const { orgId, can } = useAuth(); const qc = useQueryClient(); const [err, setErr] = useState(''); const [q, setQ] = useState('')
  const list = useQuery({ queryKey: ['docs'], queryFn: documentService.list })
  const up = useMutation({ mutationFn: (f: FormData) => documentService.upload(orgId!, f.get('file') as File, { category: f.get('category'), expires_on: f.get('expires_on') }), onSuccess: () => { setErr(''); qc.invalidateQueries({ queryKey: ['docs'] }) }, onError: (e: Error) => setErr(e.message) })
  const open = async (p: string) => { try { window.open(await documentService.url(p), '_blank', 'noopener') } catch (e) { setErr((e as Error).message) } }
  const rows = list.data?.filter((d: any) => (d.name + d.category).toLowerCase().includes(q.toLowerCase())) ?? []
  return (<div className="max-w-3xl space-y-4"><h1 className="font-display text-2xl font-semibold">Documents</h1>
    {can('documents.manage') && <form className="panel grid gap-2 sm:grid-cols-4" onSubmit={e => { e.preventDefault(); up.mutate(new FormData(e.currentTarget)); e.currentTarget.reset() }}><input name="file" type="file" required className="input sm:col-span-2" aria-label="File" /><input name="category" required defaultValue="general" className="input" aria-label="Category" /><input name="expires_on" type="date" className="input" aria-label="Expiry date" /><button className="btn w-fit" disabled={up.isPending}>{up.isPending ? 'Uploading…' : 'Upload'}</button></form>}
    <input className="input" placeholder="Search documents" aria-label="Search documents" value={q} onChange={e => setQ(e.target.value)} />
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    {list.isLoading ? <div className="panel h-20 animate-pulse" /> : !rows.length ? <div className="panel text-sm">No documents found.</div> : rows.map((d: any) => { const exp = d.expires_on && new Date(d.expires_on) < new Date()
      return (<div key={d.id} className="panel flex items-center justify-between gap-3 text-sm"><span><strong>{d.name}</strong> <span className="opacity-60">v{d.version} · {d.category} · {(d.size_bytes / 1024).toFixed(0)} KB</span>{d.expires_on && <span className={exp ? ' text-red-600' : ' opacity-60'}> · {exp ? 'Expired' : 'Expires'} {d.expires_on}</span>}</span><button className="btn" onClick={() => open(d.storage_path)}>Open</button></div>) })}</div>)
}
