// src/routes/api/wallet/topup-test/+server.ts
import { json, error } from '@sveltejs/kit'
import { dev } from '$app/environment'
import { auth } from '$lib/auth'
import { credit, Money } from '$lib/server/wallet'
import { limit } from '$lib/rate-limit'
import type { RequestHandler } from './$types'

/**
 * POST /api/wallet/topup-test
 *
 * ТЕСТОВЕ поповнення — БЕЗ реальної оплати. Доступне ТІЛЬКИ у dev-режимі.
 *
 * Body: { amountUah: number }   100-50000 грн
 *
 * У продакшені цей endpoint повертає 404, а реальне поповнення йде через
 * /api/wallet/topup → LiqPay (не реалізовано у MVP).
 */
export const POST: RequestHandler = async ({ request }) => {
  // У продакшені цього endpoint не існує
  if (!dev) {
    throw error(404, 'Not found')
  }

  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  const rl = limit(`topup-test:${session.user.id}`, {
    points: 20,
    duration: 60 * 60_000,
  })
  if (!rl.success) throw error(429, 'Too many topups')

  const body = await request.json().catch(() => null)
  if (!body) throw error(400, 'Invalid JSON')

  const amountUah = Number(body.amountUah)
  if (!Number.isFinite(amountUah) || amountUah < 50 || amountUah > 50_000) {
    throw error(400, 'Сума має бути від 50 до 50 000 грн')
  }

  const amountCents = Money.toCents(amountUah)

  await credit({
    userId: session.user.id,
    amountCents,
    type: 'TOPUP',
    description: `[TEST] Поповнення на ${Money.format(amountCents)}`,
  })

  return json({ ok: true, amountCents })
}
