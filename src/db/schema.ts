import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  dateOfBirth: text().notNull(),
  zipCode: text().notNull(),
  filingStatus: text(),
  // Supplemental insurance goals
  goalCatastrophicRisk: int({ mode: 'boolean' }).default(false),
  goalDoctorFreedom: int({ mode: 'boolean' }).default(false),
  goalMinPremium: int({ mode: 'boolean' }).default(false),
  goalMinTotalCost: int({ mode: 'boolean' }).default(false),
  goalTravelCoverage: int({ mode: 'boolean' }).default(false),
  createdAt: text().notNull(),
})
