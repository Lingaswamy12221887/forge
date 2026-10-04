import { describe, it, expect } from 'vitest'
import { prototypeService, STAGES } from '../src/services/prototypeService'
import { productSchema } from '../src/services/productService'
import { prefsSchema } from '../src/services/notificationService'
describe('prototype workflow', () => {
  it('advances one stage at a time', () => expect(prototypeService.next('review')).toEqual(['requirements']))
  it('testing can go to revision or production', () => expect(prototypeService.next('testing')).toEqual(['revision', 'production']))
  it('revision loops back to prototype', () => expect(prototypeService.next('revision')).toEqual(['prototype']))
  it('has no stage after completed', () => { expect(prototypeService.next('completed')).toEqual([]); expect(STAGES.length).toBe(12) })
})
describe('validation', () => {
  it('rejects negative price', () => expect(productSchema.safeParse({ name: 'Board', sku: 'B-1', price: -1, stock: 1 }).success).toBe(false))
  it('accepts a valid product', () => expect(productSchema.safeParse({ name: 'Board', sku: 'B-1', price: 10, stock: 1 }).success).toBe(true))
  it('requires E.164 phone numbers', () => { expect(prefsSchema.safeParse({ email_enabled: true, sms_enabled: true, phone: '9876543210' }).success).toBe(false); expect(prefsSchema.safeParse({ email_enabled: true, sms_enabled: true, phone: '+919876543210' }).success).toBe(true) })
})
import { netProfit } from '../src/lib/finance'
describe('finance', () => { it('rounds net profit to cents', () => expect(netProfit(100.1, 0.2)).toBe(99.9)) })
