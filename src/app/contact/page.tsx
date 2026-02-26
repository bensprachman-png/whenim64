import type { Metadata } from 'next'
import ContactForm from './_components/ContactForm'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the WhenIm64 team — questions, bug reports, or feature feedback welcome.',
  openGraph: {
    title: 'Contact | WhenIm64',
    description: 'Get in touch with the WhenIm64 team — questions, bug reports, or feature feedback welcome.',
  },
}

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
        <p className="text-muted-foreground leading-relaxed">
          WhenIm64 helps pre-retirees navigate Medicare enrollment, Social Security timing, Roth
          conversions, and tax-efficient withdrawal strategies — so you can retire on your own
          terms. Have a question, found a bug, or want to share feedback? We&apos;d love to hear
          from you.
        </p>
      </div>
      <ContactForm />
    </main>
  )
}
