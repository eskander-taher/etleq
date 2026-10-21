import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { buttonVariants } from '@/components/ui/button'
import { TrackedLink } from '@/components/ui/tracked-link'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'
import { getSiteSettings } from './globals'
import { scorecardFrom, type Loc } from './lib'

/** Buttons for an empty list: the scorecard and WhatsApp, so an empty page is never a dead end. */
export async function EmptyCtas({
  locale,
  path,
  placement,
  refCode,
  children,
}: {
  locale: Loc
  /** The list page's path, sent to the scorecard as `from`. */
  path: string
  placement: string
  refCode: string
  children?: ReactNode
}) {
  const [t, settings] = await Promise.all([getTranslations({ locale, namespace: 'content' }), getSiteSettings(locale)])
  return (
    <>
      <TrackedLink
        href={scorecardFrom(path)}
        event="cta_click"
        params={{ cta_id: `${placement}_empty_scorecard`, location: placement, ref_code: refCode }}
        className={buttonVariants()}
      >
        {t('cta.scorecard')}
      </TrackedLink>
      <WhatsAppButton
        message={t('cta.whatsappMessage')}
        refCode={refCode}
        placement={`${placement}_empty`}
        number={settings?.whatsappNumber}
        label={t('cta.whatsapp')}
        variant="secondary"
      />
      {children}
    </>
  )
}
