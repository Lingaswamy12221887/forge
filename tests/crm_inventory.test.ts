import { describe, it, expect } from 'vitest'
import { LEAD_STAGES, leadSchema } from '../src/services/crmService'
import { adjustSchema } from '../src/services/inventoryService'
describe('CRM', () => { it('has the 7-stage pipeline', () => expect(LEAD_STAGES).toEqual(['lead', 'qualified', 'contacted', 'proposal', 'negotiation', 'won', 'lost'])); it('rejects a bad email', () => expect(leadSchema.safeParse({ name: 'Ann', email: 'nope' }).success).toBe(false)) })
describe('inventory', () => {
  const id = '11111111-1111-4111-8111-111111111111'
  it('rejects zero adjustments', () => expect(adjustSchema.safeParse({ product: id, delta: 0, note: 'x1' }).success).toBe(false))
  it('accepts negative adjustments', () => expect(adjustSchema.safeParse({ product: id, delta: -3, note: 'damaged' }).success).toBe(true))
})
