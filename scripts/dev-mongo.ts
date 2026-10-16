/**
 * Fallback local MongoDB for development when Docker is not available.
 * Starts a single-node in-memory replica set (transactions need one) and
 * prints the DATABASE_URL to put in `.env`. Data is lost when it stops.
 *
 *   pnpm db:dev              # port 27019 by default
 *   DEV_MONGO_PORT=27020 pnpm db:dev
 *
 * Port 27017 is left alone on purpose (it may be a system MongoDB service),
 * and 27018 is used by the Docker replica set (docker-compose.yml).
 */
import { MongoMemoryReplSet } from 'mongodb-memory-server'

const port = Number(process.env.DEV_MONGO_PORT || 27019)

async function main() {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, name: 'rs0', storageEngine: 'wiredTiger' },
    instanceOpts: [{ port }],
  })
  await replSet.waitUntilRunning()
  const url = `mongodb://127.0.0.1:${port}/etleq?replicaSet=rs0&directConnection=true`
  console.log('In-memory MongoDB replica set is running.')
  console.log(`DATABASE_URL=${url}`)
  console.log('Press Ctrl+C to stop (data is not kept).')

  const stop = async () => {
    await replSet.stop()
    process.exit(0)
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
}

main().catch((error) => {
  console.error('Could not start the in-memory MongoDB:', error)
  process.exit(1)
})
