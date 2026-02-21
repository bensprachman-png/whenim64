import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { twoFactor } from 'better-auth/plugins'
import { db } from '@/db'
import { user, session, account, verification, twoFactor as twoFactorTable } from '@/db/schema'
import { sendPasswordResetEmail, sendTwoFactorOtpEmail } from '@/lib/email'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: { user, session, account, verification, twoFactor: twoFactorTable },
  }),
  trustedOrigins: ['https://whenim64.ai', 'https://www.whenim64.ai'],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url)
    },
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },
  plugins: [twoFactor({
    issuer: 'WhenIm64',
    otpOptions: {
      sendOTP: async (data: { user: { email: string }; otp: string }) => {
        await sendTwoFactorOtpEmail(data.user.email, data.otp)
      },
    },
  })],
})

export type Session = typeof auth.$Infer.Session
