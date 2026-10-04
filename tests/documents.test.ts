import { describe, it, expect } from 'vitest'
import { validateFile, MAX_BYTES } from '../src/services/documentService'
describe('document upload validation', () => {
  it('accepts a PDF', () => expect(validateFile({ type: 'application/pdf', size: 1000 })).toBeNull())
  it('rejects executables', () => expect(validateFile({ type: 'application/x-msdownload', size: 1000 })).toMatch(/not allowed/))
  it('rejects oversize and empty files', () => { expect(validateFile({ type: 'application/pdf', size: MAX_BYTES + 1 })).toMatch(/10 MB/); expect(validateFile({ type: 'application/pdf', size: 0 })).toMatch(/10 MB/) })
})
