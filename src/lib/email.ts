import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPasswordResetEmail(to: string, url: string) {
  await resend.emails.send({
    from: 'WhenIm64 <noreply@whenim64.ai>',
    to,
    subject: 'Reset your WhenIm64 password',
    html: `<p>Click <a href="${url}">here to reset your password</a>. This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
  })
}
