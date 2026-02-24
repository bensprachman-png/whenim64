import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

for (const col of ['planToAge INTEGER', 'spousePlanToAge INTEGER']) {
  const name = col.split(' ')[0]
  try {
    await client.execute(`ALTER TABLE taxScenarios ADD COLUMN ${col}`)
    console.log(`Added ${name} to taxScenarios`)
  } catch {
    console.log(`${name} already exists, skipped`)
  }
}

console.log('Done')
