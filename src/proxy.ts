import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Exclude admin, API, webhooks, short links, uploaded media, Next internals and files with an extension.
  matcher: ['/((?!admin|api|hooks|go/|media/|_next|_vercel|.*\\..*).*)'],
}
