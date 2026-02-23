import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? 'file:./whenim64.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const cols = [
  'enrolledPartA INTEGER NOT NULL DEFAULT 0',
  'enrolledPartB INTEGER NOT NULL DEFAULT 0',
  'spouseEnrolledPartA INTEGER NOT NULL DEFAULT 0',
  'spouseEnrolledPartB INTEGER NOT NULL DEFAULT 0',
  'medicarePlanType TEXT',
  'spouseMedicarePlanType TEXT',
  'pdpTier TEXT',
  'spousePdpTier TEXT',
]
for (const col of cols) {
  const name = col.split(' ')[0]
  try { await client.execute(`ALTER TABLE profiles ADD COLUMN ${col}`) }
  catch { console.log(`${name} already exists, skipped`) }
}
console.log('Done')
