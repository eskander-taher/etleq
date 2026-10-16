import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8', className)} {...props} />
}
