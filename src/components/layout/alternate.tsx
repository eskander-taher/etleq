'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * Where the language switcher should point when a page's document does not exist in the other
 * locale (brief section 5: link to that locale's section index, with a short note).
 * Paths are full, locale-prefixed paths: ar="/blog/x", en="/en/blog".
 */
export type AlternatePaths = { ar?: string; en?: string; note?: boolean }

type Ctx = { value: AlternatePaths | null; set: (v: AlternatePaths | null) => void }

const AlternateContext = createContext<Ctx>({ value: null, set: () => {} })

export function AlternatePathProvider({ children }: { children: ReactNode }) {
  const [value, set] = useState<AlternatePaths | null>(null)
  return <AlternateContext.Provider value={{ value, set }}>{children}</AlternateContext.Provider>
}

/** Read the override set by the current page (null = swap the locale prefix). */
export function useAlternatePath() {
  return useContext(AlternateContext).value
}

/**
 * Render anywhere inside a page: `<SetAlternatePath ar="/blog/x" en="/en/blog" note />`.
 * Renders nothing; clears itself when the page unmounts.
 */
export function SetAlternatePath({ ar, en, note }: AlternatePaths) {
  const { set } = useContext(AlternateContext)
  useEffect(() => {
    set({ ar, en, note })
    return () => set(null)
  }, [ar, en, note, set])
  return null
}
