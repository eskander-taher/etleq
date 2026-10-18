/** Create MongoDB indexes: `pnpm db:indexes` (run once per environment, e.g. against Atlas). */
import 'dotenv/config'

import { closeDb } from '../src/cms/db'
import { ensureIndexes } from '../src/cms/indexes'

ensureIndexes()
  .then(async () => {
    console.log('Indexes are in place.')
    await closeDb()
  })
  .catch((error) => {
    console.error('Could not create indexes:', error)
    process.exit(1)
  })
