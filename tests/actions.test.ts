import { describe, it, expect } from 'vitest'
import { runAction, isKnownAction, ACTIONS } from '../src/services/actionService'
describe('AI action framework', () => {
  it('only allow-listed actions are known', () => { expect(isKnownAction('cancel_order')).toBe(true); expect(isKnownAction('delete_user')).toBe(false); expect(isKnownAction('constructor')).toBe(false) })
  it('rejects unknown actions before any network call', async () => { await expect(runAction({ action: 'drop_tables', summary: 'x', params: {} }, 'org')).rejects.toThrow('Unknown action') })
  it('validates params', async () => { await expect(runAction({ action: 'cancel_order', summary: 'x', params: { order_id: 'not-a-uuid' } }, 'org')).rejects.toThrow() })
  it('flags cancel as destructive', () => expect(ACTIONS.cancel_order.destructive).toBe(true))
})
