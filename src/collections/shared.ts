import type { CollectionConfig, Field, GroupField } from 'payload'

import { isAdminOrEditor, publishedAndTranslated, type Role } from '@/access'
import { translationGate } from '@/hooks/gates'
import { basePath, localizedPath, siteUrl } from '@/hooks/paths'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'
import { isSampleField } from '@/hooks/samples'
import { createSlugRedirects } from '@/hooks/slug'

export { isSampleField }
export { slugField } from '@/hooks/slug'

/** `translated.ar` / `translated.en`: a locale is public only when ticked. Not localized. */
export const translatedField = (): GroupField => ({
  name: 'translated',
  type: 'group',
  localized: false,
  admin: {
    position: 'sidebar',
    description: 'Tick a language to publish it. Its required fields become mandatory; unticked languages return 404.',
  },
  fields: [
    { name: 'ar', type: 'checkbox', label: 'العربية', defaultValue: false },
    { name: 'en', type: 'checkbox', label: 'English', defaultValue: false },
  ],
})

/** Drafts, autosave and scheduled publishing for public content. */
export const contentVersions: CollectionConfig['versions'] = {
  maxPerDoc: 50,
  drafts: { autosave: { interval: 800 }, schedulePublish: true },
}

/** Access for public content edited by `editorRoles` (default admin + editor). */
export const contentAccess = (...editorRoles: Role[]): CollectionConfig['access'] => {
  const canEdit = editorRoles.length
    ? ({ req }: { req: { user?: unknown } }) => {
        const role = (req.user as { role?: string } | null)?.role
        return Boolean(role && (editorRoles as string[]).includes(role))
      }
    : isAdminOrEditor
  return {
    read: publishedAndTranslated(...editorRoles),
    readVersions: canEdit,
    create: canEdit,
    update: canEdit,
    delete: canEdit,
  }
}

/** Live preview and preview button for collections with public pages, in the editing locale. */
export const previewAdmin = (collection: string): Pick<NonNullable<CollectionConfig['admin']>, 'livePreview' | 'preview'> => {
  const url = (data: Record<string, unknown>, localeCode: string | undefined) => {
    const path = basePath(collection, data as never)
    if (!path) return null
    return `${siteUrl()}${localizedPath(path, localeCode === 'en' ? 'en' : 'ar')}`
  }
  return {
    livePreview: { url: ({ data, locale }) => url(data, locale?.code) },
    preview: (data, { locale }) => url(data as Record<string, unknown>, locale),
  }
}

/** Standard hooks for collections with public detail pages. */
export const contentHooks = (requiredLocalizedFields: string[] = ['title']): NonNullable<CollectionConfig['hooks']> => ({
  beforeChange: [translationGate(requiredLocalizedFields)],
  afterChange: [createSlugRedirects, revalidateAfterChange],
  afterDelete: [revalidateAfterDelete],
})

/** Reusable `sources` array (label, url, accessedAt). */
export const sourcesField = (): Field => ({
  name: 'sources',
  type: 'array',
  admin: { description: 'Every statistic needs a source with URL and date.' },
  fields: [
    { name: 'label', type: 'text', required: true },
    { name: 'url', type: 'text', required: true },
    { name: 'accessedAt', type: 'date' },
  ],
})

export const sidebarDate = (name: string, description?: string): Field => ({
  name,
  type: 'date',
  admin: { position: 'sidebar', description, date: { pickerAppearance: 'dayOnly' } },
})
