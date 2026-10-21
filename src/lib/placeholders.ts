/** Placeholder markers the seed and the founders' drafts use in globals ("[SAMPLE]", «[اسم الكيان …]», the dummy WhatsApp number). */
export const PLACEHOLDERS = ['[SAMPLE]', '[عينة]', '[CR', '[VAT', '[TRN', '[Licence', '[اسم', '[العنوان', '966500000000'] as const

export const placeholderIn = (text: string) => PLACEHOLDERS.find((p) => text.includes(p))

/**
 * Deep copy of a global with every placeholder string replaced by null, so unfinished founder
 * settings never render publicly. Readers already skip rows whose required text is missing.
 */
export function scrubPlaceholders<T>(value: T): T {
  if (typeof value === 'string') return (placeholderIn(value) ? null : value) as T
  if (Array.isArray(value)) return value.map(scrubPlaceholders) as T
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype)
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrubPlaceholders(v)])) as T
  return value
}
