'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

const navItems = [
  { label: 'Social Security', href: '/social-security' },
  { label: 'Medicare', href: '/medicare' },
  { label: 'Taxes', href: '/taxes' },
  { label: 'Help', href: '/help' },
  { label: 'Account', href: '/account' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto max-w-6xl px-4 flex h-16 items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight">
          WhenIm64
        </Link>
        <div className="flex items-center gap-2">
          {session && (
            <ul className="flex items-center gap-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                      pathname === item.href
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {session ? (
            <div className="flex items-center gap-3 ml-4">
              <span className="text-sm text-muted-foreground hidden sm:inline">{session.user.name}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          ) : (
            <Button asChild size="sm" className="ml-4">
              <Link href="/login">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}
