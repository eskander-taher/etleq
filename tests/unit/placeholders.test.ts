import { describe, expect, it } from 'vitest'
import { scrubPlaceholders } from '@/lib/placeholders'

describe('scrubPlaceholders', () => {
  it('nulls placeholder strings deeply and keeps real values', () => {
    const out = scrubPlaceholders({
      whatsappNumber: '966500000000',
      contactEmail: 'hello@etleq.com',
      legalEntities: [{ legalName: '[اسم الكيان القانوني — السعودية]', country: 'SA' }],
      bonuses: [{ name: '[SAMPLE] Launch kit', statedValue: 500 }, { name: 'Real bonus', statedValue: 300 }],
      confirmed: false,
    })
    expect(out.whatsappNumber).toBeNull()
    expect(out.contactEmail).toBe('hello@etleq.com')
    expect(out.legalEntities[0]).toEqual({ legalName: null, country: 'SA' })
    expect(out.bonuses.map((b) => b.name)).toEqual([null, 'Real bonus'])
    expect(out.confirmed).toBe(false)
  })

  it('leaves non-plain objects and null alone', () => {
    const d = new Date(0)
    expect(scrubPlaceholders(d)).toBe(d)
    expect(scrubPlaceholders(null)).toBeNull()
  })
})
