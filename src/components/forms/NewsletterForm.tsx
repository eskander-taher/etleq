import { env } from '@/lib/env'
import { SubscribeFormClient } from './SubscribeFormClient'

/** Email capture for the newsletter (footer, explore result) or the playbook page. */
export function NewsletterForm({
  locale,
  source = 'newsletter',
  compact = false,
  tone = 'light',
}: {
  locale: 'ar' | 'en'
  source?: 'newsletter' | 'playbook'
  /** Single-row layout for the footer. */
  compact?: boolean
  tone?: 'light' | 'dark'
}) {
  return <SubscribeFormClient locale={locale} source={source} compact={compact} tone={tone} turnstileSiteKey={env.turnstileSiteKey || null} />
}

export default NewsletterForm
