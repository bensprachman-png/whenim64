'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { CircleHelp, BookOpen, Settings, LogOut, Shield, Camera, FlaskConical } from 'lucide-react'
import HelpDialog from './help-dialog'
import GlossaryDialog from './glossary-dialog'

const DEMO_KEY        = 'wi64-demo-mode'
const TEST_PANEL_KEY  = 'wi64-test-panel'

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Social Security', href: '/social-security' },
  { label: 'Medicare', href: '/medicare' },
  { label: 'Planning', href: '/planning' },
  { label: 'Portfolio', href: '/portfolio' },
]

const iconNavItems = [
  { label: 'Account', href: '/account', icon: Settings },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [helpOpen, setHelpOpen] = useState(false)
  const [glossaryOpen, setGlossaryOpen] = useState(false)
  const [demoActive,     setDemoActive]     = useState(false)
  const [testPanelOpen,  setTestPanelOpen]  = useState(false)

  useEffect(() => {
    setDemoActive(localStorage.getItem(DEMO_KEY) === 'true')
    setTestPanelOpen(localStorage.getItem(TEST_PANEL_KEY) === 'true')
    const onDemoChange  = () => setDemoActive(localStorage.getItem(DEMO_KEY) === 'true')
    const onTestChange  = () => setTestPanelOpen(localStorage.getItem(TEST_PANEL_KEY) === 'true')
    window.addEventListener('wi64-demo-change',       onDemoChange)
    window.addEventListener('wi64-test-panel-change', onTestChange)
    return () => {
      window.removeEventListener('wi64-demo-change',       onDemoChange)
      window.removeEventListener('wi64-test-panel-change', onTestChange)
    }
  }, [])

  const toggleDemo = () => {
    const next = !demoActive
    if (next) localStorage.setItem(DEMO_KEY, 'true')
    else localStorage.removeItem(DEMO_KEY)
    setDemoActive(next)
    window.dispatchEvent(new Event('wi64-demo-change'))
  }

  const toggleTestPanel = () => {
    const next = !testPanelOpen
    if (next) localStorage.setItem(TEST_PANEL_KEY, 'true')
    else localStorage.removeItem(TEST_PANEL_KEY)
    setTestPanelOpen(next)
    window.dispatchEvent(new Event('wi64-test-panel-change'))
  }

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  const iconLinkClass = (href: string) =>
    `rounded-md p-2 transition-colors hover:bg-accent hover:text-accent-foreground ${
      pathname === href ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
    }`

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
            <div className="flex items-center gap-1 ml-3">
              <div className="h-4 w-px bg-border mx-1" />
              <button
                onClick={() => setHelpOpen(true)}
                title="Help"
                className="rounded-md p-2 transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground"
              >
                <CircleHelp className="size-[18px]" />
              </button>
              <button
                onClick={() => setGlossaryOpen(true)}
                title="Glossary"
                className="rounded-md p-2 transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground"
              >
                <BookOpen className="size-[18px]" />
              </button>
              {iconNavItems.map(({ label, href, icon: Icon }) => (
                <Link key={href} href={href} title={label} className={iconLinkClass(href)}>
                  <Icon className="size-[18px]" />
                </Link>
              ))}
              {((session.user as { role?: string }).role === 'admin' ||
                (session.user as { role?: string }).role === 'superuser') && (<>
                <Link href="/admin" title="Admin" className={iconLinkClass('/admin')}>
                  <Shield className="size-[18px]" />
                </Link>
                <button
                  onClick={toggleTestPanel}
                  title={testPanelOpen ? 'Hide test panel' : 'Show test panel'}
                  className={`rounded-md p-2 transition-colors ${
                    testPanelOpen
                      ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-950/60'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <FlaskConical className="size-[18px]" />
                </button>
                <button
                  onClick={toggleDemo}
                  title={demoActive ? 'Demo mode on — click to clear' : 'Activate demo snapshot'}
                  className={`rounded-md p-2 transition-colors ${
                    demoActive
                      ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-950/60'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Camera className="size-[18px]" />
                </button>
              </>)}
              <span className="text-sm text-muted-foreground hidden sm:inline mx-2">
                {session.user.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                title="Sign Out"
                className="text-muted-foreground size-9"
              >
                <LogOut className="size-[18px]" />
              </Button>
            </div>
          ) : pathname !== '/login' ? (
            <Button asChild size="sm" className="ml-4">
              <Link href="/login">Sign In</Link>
            </Button>
          ) : null}
        </div>
      </div>
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <GlossaryDialog open={glossaryOpen} onOpenChange={setGlossaryOpen} />
    </nav>
  )
}
