'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CheckCircle2, Mail } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { trackEvent } from '@/lib/analytics'
import { subscribeFromResult, type ActionError } from '@/actions/leads'
import { FormAlert, trackFormErrors } from '@/components/forms/fields'

/**
 * One tap on the result page sends the playbook (or newsletter) to the email the visitor just gave,
 * identified by the signed result token. The consent line sits next to the button.
 */
export function OneTapSubscribe({ locale, token, email, source }: { locale: 'ar' | 'en'; token: string; email: string; source: 'playbook' | 'newsletter' }) {
  const t = useTranslations('scorecard')
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState<ActionError | null>(null)

  async function send() {
    setError(null)
    setState('sending')
    const res = await subscribeFromResult({ locale, token, source })
    if (!res.ok) {
      trackFormErrors(`one_tap_${source}`, { _form: res.error })
      setError(res.error)
      setState('idle')
      return
    }
    trackEvent(source === 'playbook' ? 'playbook_download' : 'newsletter_signup', { source_page: window.location.pathname })
    setState('done')
  }

  if (state === 'done') {
    return (
      <p role="status" className="flex items-start gap-2 font-semibold">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-verified-600" aria-hidden="true" />
        <span>{t.rich(`oneTap.${source}.done`, { address: email, email: (chunks) => <bdi dir="ltr">{chunks}</bdi> })}</span>
      </p>
    )
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <Button type="button" size="lg" onClick={send} disabled={state === 'sending'}>
        <Mail className="size-5" aria-hidden="true" />
        {/* The address reads left to right inside either language. */}
        <span>{t.rich(`oneTap.${source}.button`, { address: email, email: (chunks) => <bdi dir="ltr">{chunks}</bdi> })}</span>
      </Button>
      <p className="text-sm text-stone-500">
        {t.rich(`oneTap.${source}.consent`, {
          privacy: (chunks) => (
            <Link href="/privacy" className="font-semibold underline underline-offset-2" target="_blank">
              {chunks}
            </Link>
          ),
        })}
      </p>
      <FormAlert error={error} />
    </div>
  )
}
