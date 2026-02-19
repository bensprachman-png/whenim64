import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  dateOfBirth: text().notNull(),
  zipCode: text().notNull(),
  filingStatus: text(),
  createdAt: text().notNull(),
})
