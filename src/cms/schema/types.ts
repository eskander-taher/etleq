/**
 * Schema types for the in-house CMS. One definition per collection drives the
 * MongoDB data layer (locale resolution, relation population, where clauses)
 * and the generic admin forms under /admin.
 *
 * Localized fields are stored as `{ ar, en }` at the level they are declared.
 */

export type Role = 'admin' | 'editor' | 'recruiter' | 'sales'
export const ROLES: Role[] = ['admin', 'editor', 'recruiter', 'sales']

export type Option = { label: string; value: string }

export type Validate = (value: unknown, siblingData: Record<string, unknown>) => true | string

type Base = {
  name: string
  label?: string
  localized?: boolean
  required?: boolean
  description?: string
  /** Shown in the right-hand column of the edit form. */
  sidebar?: boolean
  readOnly?: boolean
  /** Not shown in the admin form at all. */
  hidden?: boolean
  defaultValue?: unknown
  validate?: Validate
}

export type TextField = Base & { type: 'text' | 'textarea' | 'email' }
export type NumberField = Base & { type: 'number'; min?: number; max?: number }
export type CheckboxField = Base & { type: 'checkbox' }
export type DateField = Base & { type: 'date'; time?: boolean }
export type SelectField = Base & { type: 'select'; options: Option[] }
export type JsonField = Base & { type: 'json' }
export type RichTextField = Base & { type: 'richText' }
export type RelationField = Base & {
  type: 'relationship' | 'upload'
  relationTo: string
  hasMany?: boolean
  maxRows?: number
  /** Equality filter applied to the options in the admin (e.g. `{ purpose: 'cv' }`). */
  filter?: Record<string, string>
}
export type ArrayField = Base & { type: 'array'; fields: Field[]; maxRows?: number }
export type GroupField = Base & { type: 'group'; fields: Field[] }
export type BlocksField = Base & { type: 'blocks'; blocks: Block[] }

export type Field =
  | TextField
  | NumberField
  | CheckboxField
  | DateField
  | SelectField
  | JsonField
  | RichTextField
  | RelationField
  | ArrayField
  | GroupField
  | BlocksField

export type Block = { slug: string; label: string; fields: Field[] }

export type Access = { read: Role[]; write: Role[]; delete: Role[] }

export type CollectionConfig = {
  slug: string
  labels: { singular: string; plural: string }
  group: 'Content' | 'Careers' | 'Sales' | 'Marketing' | 'Private' | 'Admin'
  useAsTitle: string
  defaultColumns: string[]
  fields: Field[]
  /** Documents carry `_status` (draft | published). */
  drafts?: boolean
  defaultSort?: string
  access: Access
  /** Binary uploads: public images or private PDFs. */
  upload?: 'media' | 'private'
  /** Users: email + password login. */
  auth?: boolean
  hooks?: {
    /** Localized fields required in every ticked locale before publishing. */
    requiredLocalized?: string[]
    evidence?: 'model' | 'guide'
    projectConsent?: boolean
    retention?: 'lead' | 'application'
    /** `doc` revalidates the detail page, indexes and feeds; `tag` only the collection tag. */
    revalidate?: 'doc' | 'tag'
    /** Field used to generate the slug (defaults to `title`). */
    slugFrom?: string
  }
}

export type GlobalConfig = { slug: string; label: string; fields: Field[]; access: { write: Role[] } }

export const opts = (...values: string[]): Option[] => values.map((v) => ({ label: v, value: v }))
