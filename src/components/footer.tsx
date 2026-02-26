import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t mt-auto bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-muted-foreground font-semibold">Disclaimer:</strong>{' '}
          WhenIm64 is not a substitute for professional financial, tax, or healthcare advice.
          All projections, estimates, and information presented are general and hypothetical in nature
          and do not constitute personalized financial advice. Consult a qualified financial advisor,
          tax professional, or licensed Medicare counselor before making any investment, tax, or
          healthcare coverage decisions.
        </p>

        {/* Nav + copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground border-t pt-4">
          <nav className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-1">
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          </nav>
          <p>© {new Date().getFullYear()} WhenIm64</p>
        </div>

      </div>
    </footer>
  )
}
