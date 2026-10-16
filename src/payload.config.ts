import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { ar } from '@payloadcms/translations/languages/ar'
import { en } from '@payloadcms/translations/languages/en'
import { buildConfig, type Plugin } from 'payload'
import sharp from 'sharp'

import { isAdmin, isAdminOrEditor } from './access'
import { richTextBlocks } from './blocks/richTextBlocks'
import { collections } from './collections'
import { globals } from './globals'
import { anonymiseExpiredTask } from './hooks/retention'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

/** Collections that get SEO meta and can be the target of redirects. */
const PUBLIC_COLLECTIONS = ['pages', 'models', 'solutions', 'projects', 'posts', 'news', 'guides', 'jobs']

const s3Config = () => ({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: Boolean(process.env.S3_ENDPOINT),
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
})

/** S3/R2 storage, enabled only when a bucket is configured (local disk otherwise). */
const storagePlugins = (): Plugin[] => {
  const plugins: Plugin[] = []
  if (process.env.S3_BUCKET) {
    plugins.push(
      s3Storage({
        clientCacheKey: 's3:public',
        bucket: process.env.S3_BUCKET,
        config: s3Config(),
        collections: {
          media: {
            disablePayloadAccessControl: true,
            prefix: 'media',
            ...(process.env.S3_PUBLIC_URL
              ? { generateFileURL: ({ filename, prefix }) => `${process.env.S3_PUBLIC_URL!.replace(/\/$/, '')}/${prefix ? `${prefix}/` : ''}${filename}` }
              : {}),
          },
        },
      }),
    )
  }
  if (process.env.S3_PRIVATE_BUCKET) {
    plugins.push(
      s3Storage({
        clientCacheKey: 's3:private',
        bucket: process.env.S3_PRIVATE_BUCKET,
        acl: 'private',
        config: s3Config(),
        collections: {
          'private-files': {
            prefix: 'private',
            // Access control stays on; downloads are short-lived signed URLs.
            signedDownloads: { expiresIn: 300 },
          },
        },
      }),
    )
  }
  return plugins
}

const firstText = (value: unknown): string => (typeof value === 'string' ? value : '')

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: siteUrl,
  cors: [siteUrl],
  csrf: [siteUrl],
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
    connectOptions: {
      // Fail fast when the database is down (scripts lower this further).
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
    },
  }),
  sharp,
  graphQL: { disable: true },
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  admin: {
    user: 'users',
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' — Etleq admin' },
    livePreview: {
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 390, height: 844 },
        { label: 'Tablet', name: 'tablet', width: 820, height: 1180 },
        { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: richTextBlocks })],
  }),
  localization: {
    locales: [
      { code: 'ar', label: 'العربية', rtl: true },
      { code: 'en', label: 'English' },
    ],
    defaultLocale: 'ar',
    fallback: false,
  },
  i18n: {
    supportedLanguages: { ar, en },
    fallbackLanguage: 'en',
  },
  collections,
  globals,
  email: process.env.SMTP_HOST
    ? nodemailerAdapter({
        defaultFromAddress: process.env.SMTP_FROM || 'hello@etleq.com',
        defaultFromName: 'Etleq',
        transportOptions: {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
        },
      })
    : undefined, // No adapter: Payload logs emails to the console in development.
  jobs: {
    tasks: [anonymiseExpiredTask],
    access: { run: ({ req }) => isAdmin({ req }) as boolean },
    jobsCollectionOverrides: ({ defaultJobsCollection }) => ({
      ...defaultJobsCollection,
      admin: { ...(defaultJobsCollection.admin || {}), hidden: ({ user }) => (user as { role?: string } | null)?.role !== 'admin' },
    }),
    // Runs in the long-lived Node server (PM2). Scripts set DISABLE_JOBS_AUTORUN to avoid keeping the process alive.
    autoRun: () =>
      process.env.DISABLE_JOBS_AUTORUN === 'true' || process.env.NODE_ENV === 'test'
        ? []
        : [{ cron: '0 0 * * * *', queue: 'retention', limit: 5 }],
  },
  plugins: [
    seoPlugin({
      collections: PUBLIC_COLLECTIONS,
      uploadsCollection: 'media',
      generateTitle: ({ doc, locale }) => {
        const title = firstText(doc?.title)
        return locale === 'en' ? `${title} — Etleq` : `${title} — إطلاق`
      },
      generateDescription: ({ doc }) =>
        firstText(doc?.answerBox) || firstText(doc?.excerpt) || firstText(doc?.summary) || firstText(doc?.whatItDoes) || firstText(doc?.context),
      generateURL: ({ doc, collectionConfig, locale }) => {
        const section: Record<string, string> = {
          pages: '',
          models: 'models',
          solutions: 'solutions',
          projects: 'projects',
          posts: 'blog',
          news: 'news',
          guides: doc?.type === 'comparison' ? 'compare' : 'cost',
          jobs: 'careers',
        }
        const s = section[collectionConfig?.slug || ''] ?? ''
        return `${siteUrl}${locale === 'en' ? '/en' : ''}${s ? `/${s}` : ''}/${doc?.slug || ''}`
      },
    }),
    redirectsPlugin({
      collections: PUBLIC_COLLECTIONS,
      redirectTypes: ['301', '302'],
      overrides: {
        admin: { group: 'Marketing' },
        access: { read: () => true, create: isAdminOrEditor, update: isAdminOrEditor, delete: isAdminOrEditor },
      },
    }),
    ...storagePlugins(),
  ],
})
