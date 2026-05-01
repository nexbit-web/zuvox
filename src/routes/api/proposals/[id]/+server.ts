// src/routes/api/proposals/[id]/+server.ts
import { json, error } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import type { RequestHandler } from './$types'

/**
 * GET /api/proposals/[id]
 * Доступ — тільки фрілансер-автор або власник job.
 */
export const GET: RequestHandler = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: {
      freelancer: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          verificationStatus: true,
          freelancerProfile: {
            select: {
              avgRating: true,
              reviewsCount: true,
              completedOrders: true,
            },
          },
        },
      },
      job: {
        select: {
          id: true,
          title: true,
          clientId: true,
          status: true,
        },
      },
    },
  })

  if (!proposal) throw error(404, 'Не знайдено')

  const userId = session.user.id
  if (userId !== proposal.freelancerId && userId !== proposal.job.clientId) {
    throw error(403, 'Доступ заборонено')
  }

  return json({ proposal })
}

/**
 * POST /api/proposals/[id]/accept — клієнт обирає цей proposal.
 *
 * Атомарно:
 *   1. Перевіряє що клієнт — власник job
 *   2. Перевіряє що job ще OPEN
 *   3. Створює Order статусом NEGOTIATING зі знайденої домовленості
 *   4. Помічає вибраний proposal як ACCEPTED
 *   5. Помічає всі інші proposals як REJECTED
 *   6. Закриває job → CLOSED
 *   7. Створює чат якщо немає
 *
 * Lead fees НЕ повертаються відхиленим — вони вже отримали лід.
 */

// Цей файл не має POST на root. Дії accept/reject на іншому endpoint:
// див. /api/proposals/[id]/[action]/+server.ts

/**
 * DELETE /api/proposals/[id] — фрілансер відкликає свій proposal.
 *
 * Lead fee НЕ повертається — фрілансер сам передумав, лід ми вже надали.
 */
export const DELETE: RequestHandler = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      freelancerId: true,
      jobId: true,
      status: true,
    },
  })
  if (!proposal) throw error(404, 'Не знайдено')
  if (proposal.freelancerId !== session.user.id) {
    throw error(403, 'Не ваш proposal')
  }
  if (proposal.status !== 'SUBMITTED') {
    throw error(400, 'Можна відкликати тільки активний відгук')
  }

  await prisma.$transaction(async (tx) => {
    await tx.proposal.update({
      where: { id: proposal.id },
      data: {
        status: 'WITHDRAWN',
        withdrawnAt: new Date(),
      },
    })

    await tx.job.update({
      where: { id: proposal.jobId },
      data: { proposalsCount: { decrement: 1 } },
    })
  })

  return json({ ok: true })
}
