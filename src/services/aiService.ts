import { supabase } from '../lib/supabase'
export type AIMsg = { role: 'user' | 'assistant'; content: string }
export type AIProposal = { action: string; summary: string; params: Record<string, unknown> }
// Calls the ai-chat Edge Function. Provider keys live only on the server.
export const aiService = {
  async chat(messages: AIMsg[], conversationId?: string, context?: { type: string; id?: string }) {
    const { data, error } = await supabase.functions.invoke('ai-chat', { body: { messages, conversationId, context } })
    if (error) throw new Error('The assistant is unavailable. Check AI configuration.')
    return data as { conversationId: string; reply: string; proposal?: AIProposal }
  },
}
