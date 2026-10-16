import { defineRouting } from 'next-intl/routing'

export const locales = ['ar', 'en'] as const
export type Locale = (typeof locales)[number]

export const routing = defineRouting({
  locales,
  defaultLocale: 'ar',
  localePrefix: 'as-needed',
  localeDetection: false,
  alternateLinks: false,
})

export const dirOf = (locale: Locale) => (locale === 'ar' ? 'rtl' : 'ltr')
export const isLocale = (v: string): v is Locale => (locales as readonly string[]).includes(v)
