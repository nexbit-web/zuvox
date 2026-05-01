// src/routes/api/jobs/[id]/+server.ts
import { json, error } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { credit, Money } from '$lib/server/wallet'
import type { RequestHandler } from './$types'

/**
 * GET /api/jobs/[id]
 *
 * Доступ:
 *   • OPEN: всі залогінені
 *   • CLOSED/EXPIRED/CANCELLED: тільки клієнт-власник, або фрілансер який
 *     відправив proposal
 *
 * Якщо запитує гість — повертаємо публічну інформацію тільки для OPEN.
 */
export const GET: RequestHandler = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          verificationStatus: true,
          createdAt: true,
        },
      },
    },
  })
  if (!job) throw error(404, 'Заявку не знайдено')

  const userId = session?.user.id
  const isOwner = userId === job.clientId

  // ─── Перевірка доступу для не-OPEN статусів ───
  if (job.status !== 'OPEN' && !isOwner) {
    if (!userId) throw error(404, 'Заявку не знайдено')
    // Чи відправляв юзер proposal?
    const myProposal = await prisma.proposal.findUnique({
      where: {
        jobId_freelancerId: { jobId: job.id, freelancerId: userId },
      },
      select: { id: true },
    })
    if (!myProposal) throw error(404, 'Заявку не знайдено')
  }

  // ─── viewsCount інкремент (без блокування) ───
  if (!isOwner && job.status === 'OPEN') {
    prisma.job
      .update({ where: { id: job.id }, data: { viewsCount: { increment: 1 } } })
      .catch(() => {})
  }

  // ─── Якщо це власник — показуємо ВСІ proposals ───
  // Якщо фрілансер який відправив — тільки свій proposal
  let proposals: any[] = []
  let myProposal: any = null

  if (isOwner) {
    proposals = await prisma.proposal.findMany({
      where: { jobId: job.id },
      orderBy: { createdAt: 'desc' },
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
                hourlyRate: true,
                experience: true,
              },
            },
          },
        },
      },
    })
  } else if (userId) {
    myProposal = await prisma.proposal.findUnique({
      where: {
        jobId_freelancerId: { jobId: job.id, freelancerId: userId },
      },
    })
  }

  return json({
    job,
    isOwner,
    proposals,
    myProposal,
  })
}

/**
 * PATCH /api/jobs/[id] — редагування заявки.
 *
 * Дозволено тільки якщо:
 *   • Юзер — власник
 *   • Заявка ще OPEN
 *   • Не було жодного proposal (інакше нечесно міняти умови)
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      clientId: true,
      status: true,
      proposalsCount: true,
    },
  })
  if (!job) throw error(404, 'Не знайдено')
  if (job.clientId !== session.user.id) throw error(403, 'Не ваша заявка')
  if (job.status !== 'OPEN') {
    throw error(400, 'Можна редагувати тільки відкриті заявки')
  }
  if (job.proposalsCount > 0) {
    throw error(
      400,
      'Не можна редагувати заявку якщо вже є відгуки. Скасуйте і створіть нову.',
    )
  }

  const body = await request.json().catch(() => null)
  if (!body) throw error(400, 'Invalid JSON')

  const data: any = {}

  if (typeof body.title === 'string') {
    const title = body.title.trim()
    if (title.length < 10 || title.length > 200) {
      throw error(400, 'Назва: 10-200 символів')
    }
    data.title = title
  }

  if (typeof body.description === 'string') {
    const desc = body.description.trim()
    if (desc.length < 50 || desc.length > 10_000) {
      throw error(400, 'Опис: 50-10000 символів')
    }
    data.description = desc
  }

  if (typeof body.category === 'string') data.category = body.category.trim()
  if (body.subcategory !== undefined) {
    data.subcategory = body.subcategory ? String(body.subcategory).trim() : null
  }

  if (Array.isArray(body.tags)) {
    data.tags = (body.tags as unknown[])
      .filter((t): t is string => typeof t === 'string')
      .map((t) => t.toLowerCase().trim())
      .filter(Boolean)
      .slice(0, 10)
  }

  // Бюджет — спрощено, без можливості міняти budgetType (заплутано)
  if (typeof body.budgetMaxUah === 'number' && body.budgetMaxUah > 0) {
    data.budgetMaxCents = Money.toCents(body.budgetMaxUah)
  }
  if (typeof body.budgetMinUah === 'number' && body.budgetMinUah > 0) {
    data.budgetMinCents = Money.toCents(body.budgetMinUah)
  }

  const updated = await prisma.job.update({
    where: { id: job.id },
    data,
  })

  return json({ job: updated })
}

/**
 * DELETE /api/jobs/[id] — скасувати заявку.
 *
 * Логіка повернення lead fee:
 *   • Якщо < 1 години після першого proposal — повертаємо всім фрілансерам.
 *     Це захист від "опублікував → зразу видалив".
 *   • Інакше — НЕ повертаємо. Фрілансери вже отримали лід (ім'я клієнта,
 *     контакт, тематика).
 */
export const DELETE: RequestHandler = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      proposals: {
        where: { status: 'SUBMITTED' },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          freelancerId: true,
          leadFeeCents: true,
          createdAt: true,
          refunded: true,
        },
      },
    },
  })
  if (!job) throw error(404, 'Не знайдено')
  if (job.clientId !== session.user.id) throw error(403, 'Не ваша заявка')
  if (job.status !== 'OPEN') {
    throw error(400, 'Можна скасувати тільки відкриті заявки')
  }

  // ─── Чи треба повертати lead fees? ───
  // Правило: якщо перший proposal був < 1 години тому — повертаємо ВСЕ.
  const REFUND_WINDOW_MS = 60 * 60_000 // 1 година
  const firstProposal = job.proposals[0]
  const shouldRefund =
    firstProposal &&
    Date.now() - firstProposal.createdAt.getTime() < REFUND_WINDOW_MS

  await prisma.$transaction(async (tx) => {
    // 1. Закриваємо job
    await tx.job.update({
      where: { id: job.id },
      data: {
        status: 'CANCELLED',
        closedAt: new Date(),
      },
    })

    // 2. Помічаємо всі proposals як WITHDRAWN
    await tx.proposal.updateMany({
      where: { jobId: job.id, status: 'SUBMITTED' },
      data: { status: 'WITHDRAWN' },
    })

    // 3. Якщо потрібно — повертаємо lead fees
    if (shouldRefund) {
      for (const p of job.proposals) {
        if (p.refunded || p.leadFeeCents <= 0) continue

        await credit(
          {
            userId: p.freelancerId,
            amountCents: p.leadFeeCents,
            type: 'REFUND',
            description: `Повернення за скасовану заявку клієнтом`,
          },
          tx,
        )

        await tx.proposal.update({
          where: { id: p.id },
          data: { refunded: true },
        })
      }
    }
  })

  return json({
    ok: true,
    refunded: shouldRefund,
    refundedCount: shouldRefund ? job.proposals.length : 0,
  })
}
