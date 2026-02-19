import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/db'
import { users } from '@/db/schema'
import { desc } from 'drizzle-orm'
import { NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are a knowledgeable, friendly retirement planning assistant for WhenIm64. You help users understand:

- **Medicare**: Parts A, B, C (Advantage), D; enrollment windows; Medigap supplements (Plans A–N); state-specific plans (MA, MN, WI); late-enrollment penalties; IEP, SEP, GEP
- **Social Security**: claiming ages (62–70); Full Retirement Age by birth year; delayed credits (8%/yr); spousal/survivor/divorce benefits; earnings test; taxation of benefits
- **RMDs**: Required Minimum Distributions from 401(k)/IRA starting at age 73; calculation; QCDs; penalties for missing
- **Tax planning**: IRMAA Medicare surcharges; taxation of SS benefits (0/50/85%); Roth conversions; bracket management; capital gains in retirement
- **General retirement**: 4% rule; sequence-of-returns risk; healthcare costs; long-term care; inflation

Keep answers clear, accurate, and actionable. When relevant, refer users to official sources (ssa.gov, medicare.gov). Do not give personalized investment advice — recommend they consult a financial advisor for specific investment decisions. Keep responses concise unless the question requires depth.`

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured. Add it to your .env.local file.' },
      { status: 500 }
    )
  }

  const { messages } = await request.json()
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
  }

  // Enrich system prompt with user's profile for personalized answers
  const [user] = await db.select().from(users).orderBy(desc(users.id)).limit(1)
  let systemPrompt = SYSTEM_PROMPT

  if (user) {
    const age = user.dateOfBirth
      ? Math.floor((Date.now() - new Date(user.dateOfBirth + 'T00:00:00').getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null
    const birthYear = user.dateOfBirth ? new Date(user.dateOfBirth + 'T00:00:00').getFullYear() : null

    systemPrompt += `\n\n---\nUser profile (use this to personalize your answers where relevant):\n` +
      `- Name: ${user.name}\n` +
      (age ? `- Age: ${age} (born ${birthYear})\n` : '') +
      (user.zipCode ? `- ZIP code: ${user.zipCode}\n` : '') +
      (user.filingStatus ? `- Tax filing status: ${user.filingStatus.replace(/_/g, ' ')}\n` : '') +
      `- Enrolled in Medicare: ${user.enrolledMedicare ? 'Yes' : 'No'}\n` +
      `- Collecting Social Security: ${user.collectingSS ? 'Yes' : 'No'}\n`
  }

  const client = new Anthropic()

  const stream = await client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
    cancel() {
      stream.controller.abort()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
