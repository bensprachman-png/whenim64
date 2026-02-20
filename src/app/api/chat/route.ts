import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/db'
import { profiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getFullRetirementAge, fraToString, calculateMilestones } from '@/lib/milestones'
import { auth } from '@/lib/auth'

const SYSTEM_PROMPT = `You are a knowledgeable, friendly retirement planning assistant for WhenIm64. You help users understand:

- Medicare: Parts A, B, C (Advantage), D; enrollment windows; Medigap supplements (Plans A–N); state-specific plans (MA, MN, WI); late-enrollment penalties; IEP, SEP, GEP
- Social Security: claiming ages (62–70); Full Retirement Age by birth year; delayed credits (8%/yr); spousal/survivor/divorce benefits; earnings test; taxation of benefits
- RMDs: Required Minimum Distributions from 401(k)/IRA starting at age 73; calculation; QCDs; penalties for missing
- Tax planning: IRMAA Medicare surcharges; taxation of SS benefits (0/50/85%); Roth conversions; bracket management; capital gains in retirement
- General retirement: 4% rule; sequence-of-returns risk; healthcare costs; long-term care; inflation

Keep answers clear, accurate, and actionable. When relevant, refer users to official sources (ssa.gov, medicare.gov). Do not give personalized investment advice — recommend they consult a financial advisor for specific investment decisions. Keep responses concise unless the question requires depth.

Formatting rules:
- Use plain text only — no markdown headers (##), no bold (**text**), no italic (*text*)
- Use bullet points (- item) or numbered lists for multiple items
- Use a blank line between sections if the answer has more than one part`

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your-api-key-here') {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured.' },
      { status: 500 }
    )
  }

  const { messages } = await request.json()
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
  }

  // Enrich system prompt with user's profile for personalized answers
  const session = await auth.api.getSession({ headers: await headers() })
  const [user] = session
    ? await db.select().from(profiles).where(eq(profiles.userId, session.user.id)).limit(1)
    : []
  let systemPrompt = SYSTEM_PROMPT

  if (user) {
    const dob = user.dateOfBirth ? new Date(user.dateOfBirth + 'T00:00:00') : null
    const birthYear = dob?.getFullYear() ?? null
    const today = new Date()
    const currentYear = today.getFullYear()
    const age = dob
      ? Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null

    const fra = birthYear ? getFullRetirementAge(birthYear) : null
    const fraStr = fra ? fraToString(fra) : null
    const fraYear = birthYear && fra ? birthYear + fra.years : null

    const milestones = calculateMilestones(user.dateOfBirth)
    const futureMilestones = milestones.filter((m) => m.year && m.year > currentYear)

    const goals: string[] = []
    if (user.goalMinPremium)       goals.push('minimize monthly premium')
    if (user.goalMinTotalCost)     goals.push('minimize total out-of-pocket cost')
    if (user.goalCatastrophicRisk) goals.push('protect against catastrophic risk')
    if (user.goalDoctorFreedom)    goals.push('keep freedom to choose any doctor')
    if (user.goalTravelCoverage)   goals.push('maintain coverage while traveling')

    const lines: string[] = [
      `\n\n---`,
      `This is the profile of the person you are speaking with. Always tailor your answer to their specific situation. Open with their name when it helps personalise the response. Reference their exact ages, years, and deadlines — never give generic answers when their data makes a specific answer possible.`,
      `- Name: ${user.name}`,
    ]

    if (age !== null && user.dateOfBirth) lines.push(`- Date of birth: ${user.dateOfBirth} (age ${age})`)
    if (user.zipCode)             lines.push(`- ZIP code: ${user.zipCode}`)
    if (user.filingStatus)        lines.push(`- Tax filing status: ${user.filingStatus.replace(/_/g, ' ')}`)
    lines.push(`- Enrolled in Medicare: ${user.enrolledMedicare ? 'Yes' : 'No'}`)
    lines.push(`- Collecting Social Security: ${user.collectingSS ? 'Yes' : 'No'}`)
    if (fraStr && fraYear)        lines.push(`- Full Retirement Age (FRA): ${fraStr} (year ${fraYear})`)
    if (goals.length)             lines.push(`- Supplemental insurance priorities: ${goals.join(', ')}`)

    if (futureMilestones.length) {
      lines.push(`- Upcoming milestones:`)
      for (const m of futureMilestones) {
        const yearsAway = m.year! - currentYear
        lines.push(`  • ${m.label} at age ${m.age} (${m.year}, ${yearsAway} yr${yearsAway !== 1 ? 's' : ''} away)`)
      }
    }

    systemPrompt += lines.join('\n')
  }

  const client = new Anthropic({ apiKey })

  // Initiate the stream — catch auth/network errors before committing to a streaming response
  let stream: Awaited<ReturnType<typeof client.messages.stream>>
  try {
    stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to connect to Anthropic API.'
    return NextResponse.json({ error: message }, { status: 502 })
  }

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
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stream error'
        controller.enqueue(encoder.encode(`\n\n[Error: ${message}]`))
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
