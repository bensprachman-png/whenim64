import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// Better Auth tables
export const user = sqliteTable('user', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: int({ mode: 'boolean' }).notNull().default(false),
  image: text(),
  twoFactorEnabled: int({ mode: 'boolean' }).default(false),
  createdAt: int({ mode: 'timestamp' }).notNull(),
  updatedAt: int({ mode: 'timestamp' }).notNull(),
})

export const session = sqliteTable('session', {
  id: text().primaryKey(),
  expiresAt: int({ mode: 'timestamp' }).notNull(),
  token: text().notNull().unique(),
  ipAddress: text(),
  userAgent: text(),
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: int({ mode: 'timestamp' }).notNull(),
  updatedAt: int({ mode: 'timestamp' }).notNull(),
})

export const account = sqliteTable('account', {
  id: text().primaryKey(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: int({ mode: 'timestamp' }),
  refreshTokenExpiresAt: int({ mode: 'timestamp' }),
  scope: text(),
  password: text(),
  createdAt: int({ mode: 'timestamp' }).notNull(),
  updatedAt: int({ mode: 'timestamp' }).notNull(),
})

export const verification = sqliteTable('verification', {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: int({ mode: 'timestamp' }).notNull(),
  createdAt: int({ mode: 'timestamp' }),
  updatedAt: int({ mode: 'timestamp' }),
})

export const twoFactor = sqliteTable('twoFactor', {
  id: text().primaryKey(),
  secret: text(),
  backupCodes: text(),
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
})

// Retirement profile table (renamed from users)
export const profiles = sqliteTable('profiles', {
  id: int().primaryKey({ autoIncrement: true }),
  userId: text().references(() => user.id, { onDelete: 'set null' }),
  name: text().notNull(),
  email: text(),
  dateOfBirth: text().notNull(),
  zipCode: text().notNull(),
  filingStatus: text(),
  goalCatastrophicRisk: int({ mode: 'boolean' }).default(false),
  goalDoctorFreedom: int({ mode: 'boolean' }).default(false),
  goalMinPremium: int({ mode: 'boolean' }).default(false),
  goalMinTotalCost: int({ mode: 'boolean' }).default(false),
  goalTravelCoverage: int({ mode: 'boolean' }).default(false),
  enrolledMedicare: int({ mode: 'boolean' }).default(false),
  collectingSS: int({ mode: 'boolean' }).default(false),
  createdAt: text().notNull(),
})
