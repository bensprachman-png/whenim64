import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendPasswordResetEmail(to: string, url: string) {
  const { data, error } = await resend.emails.send({
    from: 'WhenIm64 <noreply@whenim64.ai>',
    to,
    subject: 'Reset your WhenIm64 password',
    html: `<p>Click <a href="${url}">here to reset your password</a>. This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
  })
  if (error) {
    console.error('[Resend] Failed to send password reset email to', to, error)
    throw new Error(error.message)
  }
  console.log('[Resend] Password reset email sent, id:', data?.id)
}

export async function sendTwoFactorOtpEmail(to: string, otp: string) {
  const { error } = await resend.emails.send({
    from: 'WhenIm64 <noreply@whenim64.ai>',
    to,
    subject: 'Your WhenIm64 sign-in code',
    html: `<p>Your sign-in code is: <strong>${otp}</strong>. It expires in 5 minutes.</p>`,
  })
  if (error) {
    console.error('[Resend] Failed to send 2FA OTP email to', to, error)
    throw new Error(error.message)
  }
}
