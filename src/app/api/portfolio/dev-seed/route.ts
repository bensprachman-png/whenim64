import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { createClient } from '@libsql/client'

export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const devUserId = session.user.id

  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    return NextResponse.json({ error: 'TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set to seed from prod' }, { status: 500 })
  }

  try {
    const prod = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    const dev = createClient({ url: 'file:./whenim64.db' })

    // Find the matching user in prod by email
    const devUserRes = await dev.execute(`SELECT email FROM user WHERE id = '${devUserId}'`)
    const email = devUserRes.rows[0]?.email as string
    if (!email) return NextResponse.json({ error: 'Dev user not found' }, { status: 404 })

    const prodUserRes = await prod.execute(`SELECT id FROM user WHERE email = '${email}'`)
    const prodUserId = prodUserRes.rows[0]?.id as string
    if (!prodUserId) return NextResponse.json({ error: `No prod user found for ${email}` }, { status: 404 })

    // Fetch prod data
    const accounts = await prod.execute(`SELECT * FROM brokerageAccounts WHERE userId = '${prodUserId}'`)
    const holdings  = await prod.execute(`SELECT * FROM holdings WHERE userId = '${prodUserId}'`)

    // Clear existing dev brokerage data
    const devAccounts = await dev.execute(`SELECT id FROM brokerageAccounts WHERE userId = '${devUserId}'`)
    for (const a of devAccounts.rows) {
      await dev.execute(`DELETE FROM holdings WHERE accountId = '${a.id}'`)
    }
    await dev.execute(`DELETE FROM brokerageAccounts WHERE userId = '${devUserId}'`)
    await dev.execute(`DELETE FROM snaptradeConnections WHERE userId = '${devUserId}'`)

    // Placeholder connection so portfolio page shows as connected
    await dev.execute(`INSERT INTO snaptradeConnections (userId, snaptradeUserSecret, createdAt) VALUES ('${devUserId}', 'dev-seed-placeholder', ${Math.floor(Date.now() / 1000)})`)

    // Insert accounts
    for (const a of accounts.rows) {
      await dev.execute({
        sql: `INSERT OR REPLACE INTO brokerageAccounts (id, userId, brokerageName, accountName, accountType, accountNumber, totalValue, currency, syncedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [a.id, devUserId, a.brokerageName, a.accountName, a.accountType, a.accountNumber, a.totalValue, a.currency, a.syncedAt],
      })
    }

    // Insert holdings
    for (const h of holdings.rows) {
      await dev.execute({
        sql: `INSERT OR REPLACE INTO holdings (id, accountId, userId, symbol, description, units, price, marketValue, costBasis, averagePurchasePrice, currency, securityType, syncedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [h.id, h.accountId, devUserId, h.symbol, h.description, h.units, h.price, h.marketValue, h.costBasis, h.averagePurchasePrice, h.currency, h.securityType, h.syncedAt],
      })
    }

    return NextResponse.json({
      success: true,
      accountCount: accounts.rows.length,
      holdingCount: holdings.rows.length,
    })
  } catch (err) {
    console.error('[dev-seed]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
