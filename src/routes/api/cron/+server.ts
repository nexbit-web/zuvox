// src/routes/api/cron/+server.ts
import { json, error } from '@sveltejs/kit'
import { prisma } from '$lib/prisma'
import { CRON_SECRET } from '$env/static/private'
import type { RequestHandler } from './$types'

/**
 * GET /api/cron?task=auto-complete|auto-expire|all
 *
 * Захищено через CRON_SECRET у заголовку Authorization.
 * Викликається зовнішнім cron-сервісом (Vercel Cron, GitHub Actions, cron-job.org).
 *
 * Приклад виклику з cron-job.org:
 *   URL: https://yourdomain.com/api/cron?task=all
 *   Headers: Authorization: Bearer YOUR_CRON_SECRET
 */

interface CronResult {
  task: string
  ok: boolean
  affected: number
  error?: string
}

export const GET: RequestHandler = async ({ url, request }) => {
  // ─── Перевірка авторизації ───
  const authHeader = request.headers.get('authorization')
  const expected = `Bearer ${CRON_SECRET}`

  if (!CRON_SECRET) {
    throw error(500, 'CRON_SECRET not configured')
  }
  if (authHeader !== expected) {
    throw error(401, 'Unauthorized')
  }

  const task = url.searchParams.get('task') ?? 'all'
  const results: CronResult[] = []

  if (task === 'auto-complete' || task === 'all') {
    results.push(await runAutoComplete())
  }

  if (task === 'auto-expire' || task === 'all') {
    results.push(await runAutoExpire())
  }

  return json({
    ok: results.every((r) => r.ok),
    runAt: new Date().toISOString(),
    results,
  })
}

/**
 * Знаходить замовлення зі статусом DELIVERED і autoCompleteAt < now.
 * Завершує їх автоматично + інкрементить лічильники + audit log.
 */
async function runAutoComplete(): Promise<CronResult> {
  try {
    const now = new Date()

    const candidates = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        autoCompleteAt: { lte: now, not: null },
      },
      select: {
        id: true,
        freelancerId: true,
      },
      take: 100, // ліміт за один прохід
    })

    if (candidates.length === 0) {
      return { task: 'auto-complete', ok: true, affected: 0 }
    }

    let affected = 0

    for (const order of candidates) {
      try {
        await prisma.$transaction(async (tx) => {
          // Перевіряємо що статус ще DELIVERED (race-safe)
          const fresh = await tx.order.findUnique({
            where: { id: order.id },
            select: { status: true },
          })
          if (fresh?.status !== 'DELIVERED') return

          await tx.order.update({
            where: { id: order.id },
            data: {
              status: 'COMPLETED',
              completedAt: now,
              autoCompleteAt: null,
            },
          })

          // Інкремент completedOrders
          await tx.freelancerProfile.update({
            where: { userId: order.freelancerId },
            data: { completedOrders: { increment: 1 } },
          })

          // Audit
          await tx.orderEvent.create({
            data: {
              orderId: order.id,
              type: 'AUTO_COMPLETED',
              actorId: null, // системна подія
              payload: { reason: 'Минуло 7 днів без реакції клієнта' } as any,
            },
          })
        })

        affected++
      } catch (err) {
        console.error(`[cron auto-complete] order ${order.id}:`, err)
      }
    }

    return { task: 'auto-complete', ok: true, affected }
  } catch (err) {
    return {
      task: 'auto-complete',
      ok: false,
      affected: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Знаходить заявки клієнтів зі статусом OPEN і expiresAt < now.
 * Помічає як EXPIRED.
 *
 * Lead fees НЕ повертаємо — фрілансери вже отримали ліди коли відгукнулись.
 */
async function runAutoExpire(): Promise<CronResult> {
  try {
    const now = new Date()

    const result = await prisma.job.updateMany({
      where: {
        status: 'OPEN',
        expiresAt: { lte: now },
      },
      data: {
        status: 'EXPIRED',
        closedAt: now,
      },
    })

    return { task: 'auto-expire', ok: true, affected: result.count }
  } catch (err) {
    return {
      task: 'auto-expire',
      ok: false,
      affected: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
