import { getTranslations } from 'next-intl/server'
import { resolveScorecardSettings, type ScorecardSettingsLike } from '@/lib/scoring'
import type { ModelCard } from '@/components/sections/offer/data'

export interface ResolvedOption {
  value: string
  label: string
}

export interface ResolvedQuestion {
  key: string
  type: 'single' | 'text' | 'model'
  prompt: string
  hint?: string
  placeholder?: string
  options: ResolvedOption[]
}

/**
 * Questions for the scorecard UI: CMS prompts/labels when present, otherwise the `scorecard`
 * messages. Points never reach the browser; scoring happens on the server.
 */
export async function resolveQuestions(locale: 'ar' | 'en', raw: ScorecardSettingsLike, models: Pick<ModelCard, 'slug' | 'title'>[]): Promise<ResolvedQuestion[]> {
  const t = await getTranslations({ locale, namespace: 'scorecard' })
  const settings = resolveScorecardSettings(raw)
  const msg = (key: string, fallback = '') => (t.has(key) ? t(key) : fallback)

  return settings.questions.map((q) => {
    const type = (q.type ?? 'single') as ResolvedQuestion['type']
    const base = `questions.${q.key}`
    const prompt = q.prompt || msg(`${base}.prompt`, q.key)
    if (type === 'model') {
      return {
        key: q.key,
        type,
        prompt,
        options: [...models.map((m) => ({ value: m.slug, label: m.title })), { value: 'other', label: msg(`${base}.other`, 'Other') }],
      }
    }
    if (type === 'text') {
      return { key: q.key, type, prompt, hint: msg(`${base}.hint`) || undefined, placeholder: msg(`${base}.placeholder`) || undefined, options: [] }
    }
    return {
      key: q.key,
      type,
      prompt,
      options: (q.options ?? []).map((o) => ({ value: o.value, label: o.label || msg(`${base}.options.${o.value}`, o.value) })),
    }
  })
}
