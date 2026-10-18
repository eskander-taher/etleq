import { cache } from 'react'
import { getGlobal } from '@/lib/queries/common'
import type { Offer, SiteSettings } from '@/cms/content-types'
import type { Loc } from './lib'

// Globals read by content templates. They never throw: a missing global must not take a page down.

export const getSiteSettings = cache(async (locale: Loc): Promise<SiteSettings | null> => {
  try {
    return ((await getGlobal('site-settings', locale)) as SiteSettings) ?? null
  } catch {
    return null
  }
})

export const getOffer = cache(async (locale: Loc): Promise<Offer | null> => {
  try {
    return ((await getGlobal('offer', locale)) as Offer) ?? null
  } catch {
    return null
  }
})
