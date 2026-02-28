import { int, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// Better Auth tables
export const user = sqliteTable('user', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: int({ mode: 'boolean' }).notNull().default(false),
  image: text(),
  twoFactorEnabled: int({ mode: 'boolean' }).default(false),
  role: text().$type<'user' | 'admin' | 'superuser'>().notNull().default('user'),
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

export const auditLog = sqliteTable('auditLog', {
  id: int().primaryKey({ autoIncrement: true }),
  userId: text().references(() => user.id, { onDelete: 'set null' }),
  event: text().notNull(),   // 'login_failure' | 'role_changed' | 'user_deleted'
  ip: text(),
  userAgent: text(),
  metadata: text(),          // JSON string
  createdAt: int({ mode: 'timestamp' }).notNull(),
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
  sex: text().$type<'male' | 'female'>(),
  spouseDateOfBirth: text(),
  spouseSex: text().$type<'male' | 'female'>(),
  goalCatastrophicRisk: int({ mode: 'boolean' }).default(false),
  goalDoctorFreedom: int({ mode: 'boolean' }).default(false),
  goalMinPremium: int({ mode: 'boolean' }).default(false),
  goalMinTotalCost: int({ mode: 'boolean' }).default(false),
  goalTravelCoverage: int({ mode: 'boolean' }).default(false),
  enrolledMedicare: int({ mode: 'boolean' }).default(false),
  collectingSS: int({ mode: 'boolean' }).default(false),
  enrolledPartA: int({ mode: 'boolean' }).default(false),
  enrolledPartB: int({ mode: 'boolean' }).default(false),
  spouseEnrolledPartA: int({ mode: 'boolean' }).default(false),
  spouseEnrolledPartB: int({ mode: 'boolean' }).default(false),
  medicarePlanType: text(),
  spouseMedicarePlanType: text(),
  pdpTier: text(),
  spousePdpTier: text(),
  createdAt: text().notNull(),
  twoFactorMethod: text(),
  isPaid: int({ mode: 'boolean' }).notNull().default(false),
  stripeCustomerId: text(),
  stripeSubscriptionId: text(),
  subscriptionStatus: text(),   // 'active' | 'trialing' | 'past_due' | 'canceled' | null
  subscriptionPlan: text(),     // 'monthly' | 'yearly' | null
  currentPeriodEnd: int(),      // Unix timestamp
})

export const snaptradeConnections = sqliteTable('snaptradeConnections', {
  userId: text().primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  snaptradeUserSecret: text().notNull(),
  createdAt: int({ mode: 'timestamp' }).notNull(),
})

export const brokerageAccounts = sqliteTable('brokerageAccounts', {
  id: text().primaryKey(),
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  brokerageName: text().notNull(),
  accountName: text(),
  accountType: text(),
  accountNumber: text(),
  totalValue: real(),
  currency: text(),
  syncedAt: int({ mode: 'timestamp' }).notNull(),
})

export const holdings = sqliteTable('holdings', {
  id: int().primaryKey({ autoIncrement: true }),
  accountId: text().notNull().references(() => brokerageAccounts.id, { onDelete: 'cascade' }),
  userId: text().notNull().references(() => user.id, { onDelete: 'cascade' }),
  symbol: text(),
  description: text(),
  units: real(),
  price: real(),
  marketValue: real(),
  costBasis: real(),
  averagePurchasePrice: real(),
  currency: text(),
  securityType: text(),
  syncedAt: int({ mode: 'timestamp' }).notNull(),
})

export const contacts = sqliteTable('contacts', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  email: text().notNull(),
  phone: text(),
  message: text().notNull(),
  isRead: int({ mode: 'boolean' }).notNull().default(false),
  createdAt: int({ mode: 'timestamp' }).notNull(),
})

export const taxScenarios = sqliteTable('taxScenarios', {
  userId: text().primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  // Income inputs (current-year baseline)
  w2Income: real().notNull().default(0),
  interestIncome: real().notNull().default(0),
  dividendIncome: real().notNull().default(0),
  capGainsDist: real().notNull().default(0),
  stcg: real().notNull().default(0),
  ltcg: real().notNull().default(0),
  otherIncome: real().notNull().default(0),
  iraBalance: real().notNull().default(0),
  iraWithdrawals: real().notNull().default(0),
  qcds: real().notNull().default(0),
  rothBalance: real().notNull().default(0),
  taxableBalance: real().notNull().default(0),
  otherAssets: real().notNull().default(0),
  realEstateValue: real().notNull().default(0),
  annualLivingExpenses: real().notNull().default(0),
  // Projection settings
  portfolioGrowthPct: real().notNull().default(5),
  retirementYear: int(),
  ssStartYear: int(),
  ssPaymentsPerYear: real().notNull().default(0),
  ssMonthlyFraBenefit: real(),  // FRA monthly benefit from SSA statement (today's $)
  filingStatus: text(),
  // Spouse SS (for MFJ — DOB stored in profiles; these are the SS inputs)
  spouseSsStartYear: int(),
  spouseSsPaymentsPerYear: real(),
  spouseSsMonthlyFraBenefit: real(),
  // Projection settings
  inflationPct: real().notNull().default(2.5),
  medicareEnrollees: int().notNull().default(1),
  medicareStartYear: int().notNull().default(0),
  irmaaTargetTier: int().notNull().default(0),
  conversionWindow: text().notNull().default('always'),
  showConversions: int({ mode: 'boolean' }).notNull().default(true),
  planToAge: int(),
  spousePlanToAge: int(),
  annualDeferredContrib: real().notNull().default(0),
  annualRothContrib: real().notNull().default(0),
  employerMatchPct: real().notNull().default(0),
  spouseAnnualDeferredContrib: real().notNull().default(0),
  spouseAnnualRothContrib: real().notNull().default(0),
  spouseEmployerMatchPct: real().notNull().default(0),
  updatedAt: int({ mode: 'timestamp' }).notNull(),
})
