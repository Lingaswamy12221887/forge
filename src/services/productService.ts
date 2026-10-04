import { z } from 'zod'
import { supabase } from '../lib/supabase'
export const productSchema = z.object({
  name: z.string().min(2).max(160), sku: z.string().min(2).max(64), description: z.string().max(4000).optional(),
  price: z.coerce.number().nonnegative(), stock: z.coerce.number().int().nonnegative(),
  image_url: z.string().url().optional().or(z.literal('').transform(() => undefined)) })
export type ProductInput = z.infer<typeof productSchema>
export const productService = {
  async list(search = '', page = 0, size = 24) {
    let q = supabase.from('products').select('*, product_categories(name)', { count: 'exact' }).is('deleted_at', null).order('created_at', { ascending: false }).range(page * size, page * size + size - 1)
    if (search.trim()) q = q.textSearch('search', search.trim(), { type: 'websearch' })
    const { data, error, count } = await q
    if (error) throw new Error('Could not load products.')
    return { rows: data ?? [], count: count ?? 0 }
  },
  async create(orgId: string, input: unknown) {
    const v = productSchema.parse(input)
    const slug = v.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 6)
    const { error } = await supabase.from('products').insert({ ...v, slug, organization_id: orgId })
    if (error) throw new Error('You may not have permission to create products.')
  },
}
