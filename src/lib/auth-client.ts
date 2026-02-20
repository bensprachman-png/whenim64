import { createAuthClient } from 'better-auth/react'
import { twoFactorClient } from 'better-auth/client/plugins'

const baseURL =
  typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? 'http://localhost:3000')

export const authClient = createAuthClient({
  baseURL,
  plugins: [twoFactorClient()],
})

export const { signIn, signUp, signOut, useSession } = authClient
