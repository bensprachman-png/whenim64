import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your-api-key-here') {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured.' }, { status: 500 })
  }

  const { text } = await request.json()
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Invalid text' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system:
      'You are a speech-to-text cleanup assistant. The user will give you a raw voice transcript. ' +
      'Fix grammar, remove filler words (um, uh, like, you know, so), correct obvious speech recognition errors, ' +
      'and make it read naturally as a written question or statement. ' +
      'Preserve the original meaning and intent exactly. Return only the cleaned text with no explanation or preamble.',
    messages: [{ role: 'user', content: text }],
  })

  const cleaned =
    message.content[0].type === 'text' ? message.content[0].text.trim() : text

  return NextResponse.json({ text: cleaned })
}
