import { Fragment } from 'react'

const LATIN_RUN = /([A-Za-z0-9$][A-Za-z0-9 .,'’&+\-/:@$%()]*[A-Za-z0-9%$)]|[A-Za-z0-9$])/g

/**
 * Wraps Latin words, numbers, URLs and emails inside Arabic text in <bdi> so they keep their order.
 * On English pages it returns the text unchanged.
 */
export function AutoBdi({ text, locale }: { text: string | null | undefined; locale: 'ar' | 'en' }) {
  if (!text) return null
  if (locale !== 'ar') return <>{text}</>
  const parts = text.split(LATIN_RUN)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <bdi key={i}>{part}</bdi> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  )
}
