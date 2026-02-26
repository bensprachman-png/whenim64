import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'WhenIm64 privacy policy — how we collect, use, and protect your information.',
  openGraph: {
    title: 'Privacy Policy | WhenIm64',
    description: 'WhenIm64 privacy policy — how we collect, use, and protect your information.',
  },
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  const effectiveDate = 'February 26, 2026'

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Effective date: {effectiveDate}</p>
      </div>

      <div className="space-y-10 text-sm">

        <Section title="Overview">
          <p>
            WhenIm64 (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is a retirement planning application
            that helps individuals navigate Medicare enrollment, Social Security timing, Roth conversions,
            and tax-efficient withdrawal strategies. This Privacy Policy explains what information we collect,
            how we use it, and your rights regarding your data.
          </p>
          <p>
            By using WhenIm64, you agree to the practices described in this policy. If you do not agree,
            please discontinue use of the service.
          </p>
        </Section>

        <Section title="Information We Collect">
          <p><strong className="text-foreground">Account information:</strong> When you create an account we
          collect your name, email address, and (if you choose password sign-in) a securely hashed password.
          You may also sign in via Google OAuth, in which case we receive your name and email from Google.</p>

          <p><strong className="text-foreground">Profile information:</strong> To personalise your retirement
          plan you may provide your date of birth, ZIP code, tax filing status, biological sex (used for life
          expectancy calculations), and spouse details. All of this is voluntary and can be updated or deleted
          at any time.</p>

          <p><strong className="text-foreground">Financial planning inputs:</strong> The Planning optimizer
          accepts income figures, account balances (IRA, Roth, taxable), Social Security estimates, and
          living-expense estimates. These are stored in our database solely to power your projections and are
          never sold or shared with third parties for marketing.</p>

          <p><strong className="text-foreground">Brokerage data (Premium):</strong> If you connect a brokerage
          account via SnapTrade, we receive and store account names, balances, and holdings data on your behalf.
          SnapTrade acts as the OAuth intermediary; we do not receive your brokerage login credentials.</p>

          <p><strong className="text-foreground">Usage data:</strong> We collect standard server logs including
          IP address, browser user-agent, pages visited, and timestamps. This information is used for security
          monitoring and debugging, not for individual tracking.</p>
        </Section>

        <Section title="How We Use Your Information">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>To provide, personalise, and improve the WhenIm64 service</li>
            <li>To calculate retirement projections, tax estimates, and Medicare plan recommendations</li>
            <li>To send transactional emails (account verification, two-factor authentication codes, password reset)</li>
            <li>To detect and prevent fraud, abuse, and security incidents</li>
            <li>To comply with legal obligations</li>
          </ul>
          <p>
            We do <strong className="text-foreground">not</strong> sell your personal information.
            We do not use your financial planning data for advertising targeting.
          </p>
        </Section>

        <Section title="Advertising and Third-Party Cookies">
          <p>
            WhenIm64 displays advertisements served by <strong className="text-foreground">Google AdSense</strong>.
            Google AdSense uses cookies and similar tracking technologies to serve ads based on your prior
            visits to this and other websites. Google&apos;s use of advertising cookies enables it and its
            partners to serve ads based on your visit to WhenIm64 and/or other websites on the Internet.
          </p>
          <p>
            You may opt out of personalised advertising by visiting{' '}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline"
            >
              Google Ads Settings
            </a>
            {' '}or{' '}
            <a
              href="https://www.aboutads.info/choices/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline"
            >
              aboutads.info
            </a>
            . You can also opt out of a third-party vendor&apos;s use of cookies for personalised advertising
            by visiting the{' '}
            <a
              href="https://optout.networkadvertising.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline"
            >
              Network Advertising Initiative opt-out page
            </a>.
          </p>
          <p>
            Ads are only shown to users on the free plan. Premium subscribers see no third-party advertising.
          </p>
        </Section>

        <Section title="Third-Party Services">
          <p>We use the following third-party services to operate WhenIm64:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-foreground">Google OAuth</strong> — optional sign-in via Google account.
              Governed by Google&apos;s{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
                Privacy Policy
              </a>.
            </li>
            <li>
              <strong className="text-foreground">Google AdSense</strong> — advertising platform for free users.
              Uses cookies for contextual and interest-based ad serving. See Google&apos;s{' '}
              <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
                Advertising Policy
              </a>.
            </li>
            <li>
              <strong className="text-foreground">Resend</strong> — transactional email delivery (verification
              codes, password reset). Resend receives your email address solely to deliver these messages.
            </li>
            <li>
              <strong className="text-foreground">SnapTrade</strong> — brokerage OAuth connection for Premium
              portfolio import. SnapTrade&apos;s{' '}
              <a href="https://snaptrade.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
                Privacy Policy
              </a>{' '}governs their handling of your brokerage credentials.
            </li>
            <li>
              <strong className="text-foreground">Turso (SQLite)</strong> — our cloud database provider.
              All data is stored in US data centres and encrypted at rest.
            </li>
          </ul>
        </Section>

        <Section title="Data Retention">
          <p>
            We retain your account and profile data for as long as your account is active. If you delete your
            account, we will delete or anonymise your personal information within 30 days, except where
            retention is required for legal compliance or fraud prevention.
          </p>
          <p>
            Server log data is retained for up to 90 days. Aggregated, anonymised analytics may be retained
            indefinitely.
          </p>
        </Section>

        <Section title="Security">
          <p>
            We use industry-standard security practices including HTTPS encryption in transit, bcrypt password
            hashing, and encrypted storage of sensitive values. We support two-factor authentication (email
            OTP and TOTP authenticator apps) for all accounts.
          </p>
          <p>
            No method of electronic transmission or storage is 100% secure. We encourage you to use a strong
            password and enable two-factor authentication on your account.
          </p>
        </Section>

        <Section title="Your Rights">
          <p>You may at any time:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Access or update your profile data on the <Link href="/account" className="text-primary underline hover:no-underline">Account page</Link></li>
            <li>Delete individual financial planning inputs from the Planning and Dashboard pages</li>
            <li>Request a copy or deletion of all your data by contacting us (see below)</li>
            <li>Opt out of personalised ads via Google Ads Settings or browser cookie controls</li>
          </ul>
          <p>
            If you are located in the European Economic Area or California, you may have additional rights
            under GDPR or CCPA. Please contact us to exercise them.
          </p>
        </Section>

        <Section title="Children's Privacy">
          <p>
            WhenIm64 is intended for adults planning for retirement and is not directed at children under the
            age of 13. We do not knowingly collect personal information from children. If you believe a child
            has provided us with personal information, please contact us and we will delete it promptly.
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material changes by
            updating the effective date at the top of this page. Continued use of WhenIm64 after a change
            constitutes acceptance of the revised policy.
          </p>
        </Section>

        <Section title="Contact Us">
          <p>
            If you have questions or requests regarding this Privacy Policy, please use our{' '}
            <Link href="/contact" className="text-primary underline hover:no-underline">contact form</Link>{' '}
            or email us directly. We aim to respond within 5 business days.
          </p>
        </Section>

      </div>

      {/* Footer nav */}
      <div className="mt-12 pt-8 border-t flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">← Back to home</Link>
        <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
        <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
      </div>
    </main>
  )
}
