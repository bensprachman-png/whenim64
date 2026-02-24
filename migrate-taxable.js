import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

try {
  await client.execute('ALTER TABLE taxScenarios ADD COLUMN taxableBalance REAL NOT NULL DEFAULT 0')
  console.log('Added taxableBalance to taxScenarios')
} catch {
  console.log('taxableBalance already exists, skipped')
}

console.log('Done')
