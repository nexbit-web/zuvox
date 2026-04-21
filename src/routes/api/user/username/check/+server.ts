// src/routes/api/user/username/check/+server.ts
import { json } from '@sveltejs/kit'
import { prisma } from '$lib/prisma'
import { limit, getClientKey } from '$lib/rate-limit'
import type { RequestHandler } from './$types'

const USERNAME_RE = /^[a-z][a-z0-9_]{2,19}$/

const RESERVED = new Set([
  'admin',
  'root',
  'api',
  'support',
  'help',
  'zuvox',
  'system',
  'user',
  'users',
  'profile',
  'dashboard',
  'settings',
  'login',
  'register',
  'signup',
  'logout',
  'moderation',
  'verified',
  'null',
  'undefined',
  'anonymous',
])

export const GET: RequestHandler = async ({ url, request }) => {
  // Rate-limit — 60 запитів/хвилина на IP
  const key = getClientKey(request, 'username-check')
  const rl = limit(key, { points: 60, duration: 60_000 })

  if (!rl.success) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
      },
    })
  }

  const raw = (url.searchParams.get('u') ?? '').trim().toLowerCase()

  if (!raw) {
    return json({ valid: false, available: false, reason: 'empty' })
  }

  if (!USERNAME_RE.test(raw)) {
    return json({
      valid: false,
      available: false,
      reason: 'format',
      hint: 'Тільки латиниця, цифри та _. 3–20 символів. Починається з літери.',
    })
  }

  if (RESERVED.has(raw)) {
    return json({
      valid: true,
      available: false,
      reason: 'reserved',
      suggestions: await generateSuggestions(raw),
    })
  }

  const existing = await prisma.user.findUnique({
    where: { username: raw },
    select: { id: true },
  })

  if (existing) {
    return json({
      valid: true,
      available: false,
      reason: 'taken',
      suggestions: await generateSuggestions(raw),
    })
  }

  return json({ valid: true, available: true })
}

async function generateSuggestions(base: string): Promise<string[]> {
  const clean = base.slice(0, 15)
  const candidates = [
    `${clean}_${Math.floor(Math.random() * 900 + 100)}`,
    `${clean}${new Date().getFullYear().toString().slice(2)}`,
    `${clean}_pro`,
    `${clean}_ua`,
    `the_${clean}`,
  ]

  const taken = await prisma.user.findMany({
    where: { username: { in: candidates } },
    select: { username: true },
  })
  const takenSet = new Set(taken.map((u) => u.username))

  return candidates.filter((c) => !takenSet.has(c)).slice(0, 3)
}
