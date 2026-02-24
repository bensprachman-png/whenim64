import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

try {
  await client.execute('ALTER TABLE taxScenarios ADD COLUMN annualLivingExpenses REAL NOT NULL DEFAULT 0')
  console.log('Added annualLivingExpenses to taxScenarios')
} catch {
  console.log('annualLivingExpenses already exists, skipped')
}

console.log('Done')
