import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { contacts } from '@/db/schema'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, email, phone, message, website } = body as Record<string, string>

  // Honeypot: real users never fill this field — silently succeed to avoid tipping off bots
  if (website) return NextResponse.json({ success: true })

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!email?.trim() || !email.includes('@')) return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

  await db.insert(contacts).values({
    name: name.trim(),
    email: email.trim(),
    phone: phone?.trim() || null,
    message: message.trim(),
    isRead: false,
    createdAt: new Date(),
  })

  return NextResponse.json({ success: true })
}
