import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const cols = [
  'sex TEXT',
  'spouseDateOfBirth TEXT',
  'spouseSex TEXT',
  'twoFactorMethod TEXT',
]

for (const col of cols) {
  const name = col.split(' ')[0]
  try {
    await client.execute(`ALTER TABLE profiles ADD COLUMN ${col}`)
    console.log(`Added ${name}`)
  } catch {
    console.log(`${name} already exists, skipped`)
  }
}

console.log('Done')
