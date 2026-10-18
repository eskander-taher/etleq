import { type Db, MongoClient, ObjectId } from 'mongodb'

/**
 * One MongoClient per process (kept on globalThis so dev hot reloads and
 * serverless warm starts reuse it). The database name comes from the
 * connection string, or DATABASE_NAME when the string has none (Atlas).
 */

const cache = globalThis as unknown as { __etleqMongo?: Promise<MongoClient> }

export async function getDb(): Promise<Db> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  if (!cache.__etleqMongo) {
    const client = new MongoClient(url, {
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
      maxPoolSize: 10,
    })
    cache.__etleqMongo = client.connect().catch((error) => {
      cache.__etleqMongo = undefined
      throw error
    })
  }
  const client = await cache.__etleqMongo
  return client.db(process.env.DATABASE_NAME || undefined)
}

export async function closeDb() {
  if (!cache.__etleqMongo) return
  const client = await cache.__etleqMongo.catch(() => null)
  cache.__etleqMongo = undefined
  await client?.close()
}

/** New document / row id (24 hex chars, like Payload's ObjectId ids). */
export const newId = () => new ObjectId().toHexString()

/** Ids are stored as strings; documents created by Payload used ObjectIds. Match both. */
export function idCandidates(id: unknown): unknown[] {
  const s = String(id)
  return ObjectId.isValid(s) && s.length === 24 ? [s, new ObjectId(s)] : [s]
}

export const idString = (value: unknown): string => (value instanceof ObjectId ? value.toHexString() : String(value))

/** Mongo collection holding the binary data of uploads, keyed by the upload document id. */
export const FILES_COLLECTION = 'upload-files'
export const GLOBALS_COLLECTION = 'globals'
