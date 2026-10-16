import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { ArrowRight, Search } from 'lucide-react'
import type { Locale } from '@/i18n/routing'
import { localePath } from '@/lib/utils'
import { Link } from '@/i18n/navigation'
import { buttonVariants } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { TrackedLink } from '@/components/ui/tracked-link'
import { Trajectory } from '@/components/ui/trajectory'

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations({ locale, namespace: 'common' })
  return { title: t('notFound.metaTitle'), robots: { index: false, follow: true } }
}

const TOP_LINKS = [
  { key: 'launch30', href: '/launch-30' },
  { key: 'models', href: '/models' },
  { key: 'howItWorks', href: '/how-it-works' },
  { key: 'blog', href: '/blog' },
  { key: 'faq', href: '/faq' },
  { key: 'contact', href: '/contact' },
] as const

export default async function NotFound() {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations({ locale, namespace: 'common' })

  return (
    <>
      <section className="relative overflow-hidden bg-sand-100">
        <div className="pointer-events-none absolute -bottom-10 end-0 w-[30rem] max-w-full opacity-70" aria-hidden="true">
          <Trajectory milestones={false} />
        </div>
        <Container className="relative py-16 sm:py-24">
          <p className="num text-sm font-medium text-ink-600">{t('notFound.eyebrow')}</p>
          <h1 className="mt-3 max-w-2xl text-display-1 font-bold">{t('notFound.title')}</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-600">{t('notFound.lead')}</p>

          {/* Plain GET form: works without JavaScript */}
          <form action={localePath(locale, '/blog')} method="get" role="search" className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
            <label htmlFor="nf-q" className="sr-only">
              {t('notFound.searchLabel')}
            </label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-stone-500" aria-hidden="true" />
              <input
                id="nf-q"
                name="q"
                type="search"
                dir="auto"
                placeholder={t('notFound.searchPlaceholder')}
                className="min-h-12 w-full rounded-button border border-sand-300 bg-white ps-12 pe-4 text-base placeholder:text-stone-500 focus:border-ink-950"
              />
            </div>
            <button type="submit" className={buttonVariants({ variant: 'secondary' })}>
              {t('notFound.searchButton')}
            </button>
          </form>
        </Container>
      </section>

      <Container className="grid gap-12 py-14 lg:grid-cols-12 lg:py-20">
        <nav aria-labelledby="nf-links" className="lg:col-span-6">
          <h2 id="nf-links" className="text-display-3 font-bold">
            {t('notFound.topLinks')}
          </h2>
          <ul className="mt-6 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {TOP_LINKS.map((l) => (
              <li key={l.href} className="border-b border-sand-300">
                <Link href={l.href} className="flex min-h-14 items-center justify-between gap-3 font-semibold hover:text-ink-600">
                  {t(`nav.${l.key}`)}
                  <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="rounded-card bg-ink-950 p-8 text-sand-50 lg:col-span-6" data-tone="dark">
          <h2 className="text-display-3 font-bold">{t('notFound.ctaTitle')}</h2>
          <p className="mt-3 text-sand-300">{t('notFound.ctaText')}</p>
          <TrackedLink
            href="/scorecard"
            event="cta_click"
            params={{ cta_id: 'scorecard', location: '404' }}
            className={`${buttonVariants({ variant: 'primary' })} mt-6`}
          >
            {t('cta.scorecardLong')}
          </TrackedLink>
        </div>
      </Container>
    </>
  )
}
