import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

export const buttonVariants = cva(
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] px-6 text-base font-semibold transition-colors duration-200 ease-out disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Ink text on ignition-500 (white fails AA)
        primary: 'bg-ignition-500 text-ink-950 hover:bg-[#ff7343]',
        secondary: 'border border-ink-950 text-ink-950 hover:bg-ink-950 hover:text-sand-50',
        'secondary-dark': 'border border-sand-300 text-sand-50 hover:bg-sand-50 hover:text-ink-950',
        ghost: 'text-ink-950 hover:bg-sand-100',
        whatsapp: 'bg-[#25D366] text-ink-950 hover:bg-[#1fbe5b]',
      },
      size: {
        md: '',
        lg: 'min-h-14 px-8 text-lg',
        sm: 'min-h-10 px-4 text-sm',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>

export function Button({
  className,
  variant,
  size,
  block,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariantProps) {
  return <button className={cn(buttonVariants({ variant, size, block }), className)} {...props} />
}
