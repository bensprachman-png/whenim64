// Run: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node migrate-roth-balance.js
const { createClient } = require('@libsql/client')

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function main() {
  await client.execute(`ALTER TABLE taxScenarios ADD COLUMN rothBalance REAL NOT NULL DEFAULT 0`)
  console.log('rothBalance column added to taxScenarios')
  process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })
