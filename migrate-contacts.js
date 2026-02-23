// Run: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node migrate-contacts.js
const { createClient } = require('@libsql/client')

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function main() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT NOT NULL,
      isRead INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL
    )
  `)
  console.log('contacts table created in Turso')
  process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })
