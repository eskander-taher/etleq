import { describe, expect, it } from 'vitest'
import { swapLocalePath } from '@/components/layout/locale-paths'

describe('production language switch links', () => {
  it('does not leak the internal Arabic route into English links', () => {
    expect(swapLocalePath('/ar', 'en')).toBe('/en')
    expect(swapLocalePath('/ar/audit', 'en')).toBe('/en/audit')
    expect(swapLocalePath('/ar/audit/sample', 'en')).toBe('/en/audit/sample')
  })
  it('preserves public Arabic URLs and English-to-Arabic switching', () => {
    expect(swapLocalePath('/', 'en')).toBe('/en')
    expect(swapLocalePath('/audit', 'en')).toBe('/en/audit')
    expect(swapLocalePath('/en/audit', 'ar')).toBe('/audit')
    expect(swapLocalePath('/articles', 'en')).toBe('/en/articles')
  })
})
