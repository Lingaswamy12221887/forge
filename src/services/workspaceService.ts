import { z } from 'zod'
import { supabase } from '../lib/supabase'
export const TASK_STATES = ['todo', 'doing', 'done'] as const
const task = z.object({ title: z.string().min(2).max(200), due_date: z.string().optional().transform(v => v || null) })
export const workspaceService = {
  async tasks(pid: string) { const { data, error } = await supabase.from('project_tasks').select('*').eq('prototype_id', pid).order('created_at'); if (error) throw new Error('Could not load tasks.'); return data ?? [] },
  async comments(pid: string) { const { data, error } = await supabase.from('project_comments').select('*').eq('prototype_id', pid).order('created_at'); if (error) throw new Error('Could not load comments.'); return data ?? [] },
  async addTask(orgId: string, pid: string, input: unknown) { const v = task.parse(input); const { error } = await supabase.from('project_tasks').insert({ ...v, organization_id: orgId, prototype_id: pid }); if (error) throw new Error('Only project staff can add tasks.') },
  async setTask(id: string, status: string) { const { error } = await supabase.from('project_tasks').update({ status }).eq('id', id); if (error) throw new Error('Only project staff can change tasks.') },
  async comment(pid: string, body: string) { const b = z.string().min(1).max(4000).parse(body.trim()); const { error } = await supabase.from('project_comments').insert({ prototype_id: pid, body: b }); if (error) throw new Error('Could not post your comment.') },
}
