import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { user as userTable } from '@/db/schema'
import { writeAuditLog } from '@/lib/admin'

const authHandlers = toNextJsHandler(auth)

export const GET = authHandlers.GET

export async function POST(request: Request) {
  const url = new URL(request.url)
  const cloned = request.clone()

  const response = await authHandlers.POST(request)

  if (response.status === 401 && url.pathname.endsWith('/sign-in/email')) {
    try {
      const body = await cloned.json()
      const email = body?.email as string | undefined

      let userId: string | null = null
      if (email) {
        const [found] = await db
          .select({ id: userTable.id })
          .from(userTable)
          .where(eq(userTable.email, email))
        userId = found?.id ?? null
      }

      await writeAuditLog({
        userId,
        event: 'login_failure',
        ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
        metadata: email ? { email } : null,
      })
    } catch {
      // Never let audit logging break the auth response
    }
  }

  return response
}
