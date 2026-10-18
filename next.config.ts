import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const isStaging = process.env.SITE_ENV === 'staging'

const nextConfig: NextConfig = {
  trailingSlash: false,
  experimental: { serverActions: { bodySizeLimit: '4.5mb' } }, // CV uploads up to 4 MB (Vercel's request limit is 4.5 MB)
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
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
