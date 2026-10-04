import { z } from 'zod'
import { supabase } from '../lib/supabase'
export const MAX_BYTES = 10 * 1024 * 1024
export const ALLOWED = ['application/pdf', 'text/plain', 'text/csv', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
export function validateFile(f: { type: string; size: number }) { if (!ALLOWED.includes(f.type)) return 'This file type is not allowed. Use PDF, DOCX, TXT, CSV, PNG or JPG.'; if (f.size <= 0 || f.size > MAX_BYTES) return 'Files must be under 10 MB.'; return null }
const meta = z.object({ category: z.string().min(2).max(40), expires_on: z.string().optional().transform(v => v || null) })
export const documentService = {
  async list() { const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false }).limit(100); if (error) throw new Error('Could not load documents.'); return data ?? [] },
  async upload(orgId: string, file: File, input: unknown) {
    const bad = validateFile(file); if (bad) throw new Error(bad); const m = meta.parse(input)
    const { count } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('name', file.name)
    const path = `${orgId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, '_')}`
    const up = await supabase.storage.from('documents').upload(path, file, { contentType: file.type }); if (up.error) throw new Error('Upload failed. Try again.')
    const { error } = await supabase.from('documents').insert({ organization_id: orgId, name: file.name, category: m.category, expires_on: m.expires_on, storage_path: path, mime: file.type, size_bytes: file.size, version: (count ?? 0) + 1 })
    if (error) { await supabase.storage.from('documents').remove([path]); throw new Error('You need document access to upload files.') }
  },
  async url(path: string) { const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 60); if (error || !data) throw new Error('Could not open the file.'); return data.signedUrl },
}
