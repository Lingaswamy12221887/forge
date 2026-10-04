import { describe, it, expect } from 'vitest'
import { toCsv } from '../src/lib/csv'
describe('toCsv', () => {
  it('quotes commas and quotes', () => expect(toCsv([{ a: 'x,y', b: 'say "hi"' }])).toBe('a,b\n"x,y","say ""hi"""'))
  it('neutralises spreadsheet formulas', () => expect(toCsv([{ a: '=HYPERLINK("x")' }]).split('\n')[1].startsWith('"\'=')).toBe(true))
  it('returns empty string for no rows', () => expect(toCsv([])).toBe(''))
})
