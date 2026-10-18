import type { Config } from './content-types'

/** Query and result types of the CMS data layer (Payload-compatible subset). */

type Internal =
  | 'payload-kv'
  | 'payload-jobs'
  | 'payload-locked-documents'
  | 'payload-preferences'
  | 'payload-migrations'
  | 'redirects'

export type CollectionSlug = Exclude<keyof Config['collections'], Internal>
export type GlobalSlug = Exclude<keyof Config['globals'], 'payload-jobs-stats'>
export type DataFromCollectionSlug<S extends CollectionSlug> = Config['collections'][S]
export type DataFromGlobalSlug<S extends GlobalSlug> = Config['globals'][S]

export type Locale = 'ar' | 'en'

export type WhereOperator = {
  equals?: unknown
  not_equals?: unknown
  in?: unknown[]
  not_in?: unknown[]
  like?: string
  contains?: string
  exists?: boolean
  greater_than?: unknown
  greater_than_equal?: unknown
  less_than?: unknown
  less_than_equal?: unknown
}

export type Where = {
  and?: Where[]
  or?: Where[]
  [path: string]: WhereOperator | Where[] | undefined
}

export type Sort = string | string[]

export type PaginatedDocs<T> = {
  docs: T[]
  totalDocs: number
  limit: number
  totalPages: number
  page: number
  pagingCounter: number
  hasPrevPage: boolean
  hasNextPage: boolean
  prevPage: number | null
  nextPage: number | null
}

/** Context flags for writes (seed script, retention job). */
export type WriteContext = { seed?: boolean; disableRevalidate?: boolean; retentionJob?: boolean }

export class ValidationError extends Error {
  constructor(public problems: { path: string; message: string }[]) {
    super(problems.map((p) => p.message).join('\n'))
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends Error {
  constructor(collection: string, id: string) {
    super(`${collection} ${id} not found`)
    this.name = 'NotFoundError'
  }
}
