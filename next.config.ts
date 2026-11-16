import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const isStaging = process.env.SITE_ENV === 'staging'
const indexNowKey = process.env.INDEXNOW_KEY?.trim()

const nextConfig: NextConfig = {
  trailingSlash: false,
  experimental: { serverActions: { bodySizeLimit: '4.5mb' } }, // CV uploads up to 4 MB (Vercel's request limit is 4.5 MB)
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // Also serve the IndexNow key at the conventional /<key>.txt (pings point to /indexnow-key.txt).
  async redirects() {
    const moves: Record<string, string> = {
      '/launch-30': '/services',
      '/how-it-works': '/method',
      '/book': '/contact',
      '/scorecard': '/audit',
      '/models': '/services',
      '/solutions': '/services',
      '/projects': '/work',
      '/cost': '/pricing',
      '/compare': '/pricing',
      '/playbook': '/learn',
    }
    return Object.entries(moves).flatMap(([source, destination]) =>
      ['', '/ar', '/en'].map((prefix) => ({
        source: prefix + source,
        destination: prefix + destination,
        permanent: true,
      })),
    )
  },
  async rewrites() {
    return indexNowKey && /^[a-zA-Z0-9-]{8,128}$/.test(indexNowKey)
      ? [{ source: `/${indexNowKey}.txt`, destination: '/indexnow-key.txt' }]
      : []
  },
  async headers() {
    const base = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    ]
    if (isStaging) base.push({ key: 'X-Robots-Tag', value: 'noindex, nofollow' })
    return [{ source: '/:path*', headers: base }]
  },
}

export default withNextIntl(nextConfig)
