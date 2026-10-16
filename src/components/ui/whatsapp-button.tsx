import { cn } from '@/lib/utils'
import { env } from '@/lib/env'
import { whatsappLink } from '@/lib/whatsapp'
import { buttonVariants, type ButtonVariantProps } from './button'
import { WhatsAppIcon } from './icons'
import { TrackedAnchor } from './tracked-link'

export type WhatsAppButtonProps = {
  /** Page-specific message in the page language, e.g. «مرحبًا، شاهدت صفحة النموذج…». */
  message: string
  /** Reference code appended as "(ref: M-123)" and sent as `ref_code`. */
  refCode?: string
  /** Where on the page the link sits (`location` param of whatsapp_click). */
  placement: string
  /** E.164 digits without '+'; falls back to WHATSAPP_NUMBER. Renders nothing when neither is set. */
  number?: string | null
  label?: string
  /** `icon` renders a 48px icon-only link; `label` is then required for its accessible name. */
  appearance?: 'button' | 'icon' | 'link'
  variant?: ButtonVariantProps['variant']
  size?: ButtonVariantProps['size']
  block?: boolean
  className?: string
}

/** Click-to-chat link (brief section 9). Server-rendered anchor; only the click tracking runs on the client. */
export function WhatsAppButton({
  message,
  refCode,
  placement,
  number,
  label,
  appearance = 'button',
  variant = 'whatsapp',
  size,
  block,
  className,
}: WhatsAppButtonProps) {
  const digits = (number || env.whatsappNumber || '').replace(/[^\d]/g, '')
  if (!digits) return null
  const href = whatsappLink({ number: digits, message, ref: refCode })
  const params = { location: placement, ref_code: refCode }

  if (appearance === 'icon') {
    return (
      <TrackedAnchor
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        event="whatsapp_click"
        params={params}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex size-12 items-center justify-center rounded-button text-ink-950 transition-colors duration-200 hover:bg-sand-100',
          className,
        )}
      >
        <WhatsAppIcon className="size-6" />
      </TrackedAnchor>
    )
  }

  if (appearance === 'link') {
    return (
      <TrackedAnchor
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        event="whatsapp_click"
        params={params}
        className={cn('inline-flex items-center gap-2 font-semibold underline-offset-4 hover:underline', className)}
      >
        <WhatsAppIcon />
        {label}
      </TrackedAnchor>
    )
  }

  return (
    <TrackedAnchor
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      event="whatsapp_click"
      params={params}
      className={cn(buttonVariants({ variant, size, block }), className)}
    >
      <WhatsAppIcon />
      {label}
    </TrackedAnchor>
  )
}
