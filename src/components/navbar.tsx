'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Social Security', href: '/social-security' },
  { label: 'Medicare', href: '/medicare' },
  { label: 'Taxes', href: '/taxes' },
  { label: 'Help', href: '/help' },
  { label: 'Account', href: '/account' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto max-w-6xl px-4 flex h-16 items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight">
          WhenIm64
        </Link>
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
      </div>
    </nav>
  )
}
