// src/routes/api/reviews/+server.ts
import { json, error } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { limit } from '$lib/rate-limit'
import { Notify } from '$lib/server/notifications'
import type { RequestHandler } from './$types'

/**
 * POST /api/reviews
 *
 * Body: { orderId, rating: 1-5, comment?: string }
 *
 * Двосторонні відгуки:
 *   • Клієнт → Фрілансер (CLIENT_TO_FREELANCER)
 *   • Фрілансер → Клієнт (FREELANCER_TO_CLIENT)
 *
 * direction визначається автоматично з того, хто автор. Кожен учасник може
 * залишити тільки 1 відгук на замовлення (унікальність [orderId, direction]).
 *
 * Атомарно:
 *   1. Створює Review з потрібним direction
 *   2. Перераховує рейтинг отримувача (FreelancerProfile або User.clientAvgRating)
 *   3. Якщо CLIENT_TO_FREELANCER + є gigId — перераховує також Gig.avgRating
 */
export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  const rl = limit(`review:${session.user.id}`, {
    points: 20,
    duration: 60 * 60_000,
  })
  if (!rl.success) throw error(429, 'Too many reviews')

  const body = await request.json().catch(() => null)
  if (!body) throw error(400, 'Invalid JSON')

  const orderId = String(body.orderId ?? '')
  const rating = Number(body.rating)
  const comment = body.comment ? String(body.comment).trim() : null

  if (!orderId) throw error(400, 'orderId required')
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw error(400, 'Рейтинг 1-5')
  }
  if (comment && comment.length > 2000) {
    throw error(400, 'Коментар занадто довгий')
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      clientId: true,
      freelancerId: true,
      gigId: true,
      reviews: {
        select: { id: true, direction: true, authorId: true },
      },
    },
  })

  if (!order) throw error(404, 'Замовлення не знайдено')

  const isClient = order.clientId === session.user.id
  const isFreelancer = order.freelancerId === session.user.id

  if (!isClient && !isFreelancer) {
    throw error(403, 'Ви не учасник цього замовлення')
  }

  if (order.status !== 'COMPLETED') {
    throw error(400, 'Відгук можна залишити тільки після завершення')
  }

  // ─── Визначаємо напрямок ───
  const direction = isClient ? 'CLIENT_TO_FREELANCER' : 'FREELANCER_TO_CLIENT'
  const recipientId = isClient ? order.freelancerId : order.clientId

  // ─── Перевірка дублікату по напрямку ───
  const alreadyExists = order.reviews.some((r) => r.direction === direction)
  if (alreadyExists) {
    throw error(400, 'Ви вже залишили відгук про цю людину')
  }

  // ─── Атомарне створення review + recalc метрик ───
  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        rating,
        comment,
        direction: direction as any,
        orderId: order.id,
        // gigId тільки якщо клієнт оцінює фрілансера + це з гіга
        gigId: direction === 'CLIENT_TO_FREELANCER' ? order.gigId : null,
        authorId: session.user.id,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        direction: true,
        createdAt: true,
      },
    })

    if (direction === 'CLIENT_TO_FREELANCER') {
      // Recalc FreelancerProfile.avgRating (тільки CLIENT→FREELANCER reviews)
      const agg = await tx.review.aggregate({
        where: {
          direction: 'CLIENT_TO_FREELANCER' as any,
          order: { freelancerId: order.freelancerId },
        },
        _avg: { rating: true },
        _count: { id: true },
      })

      await tx.freelancerProfile.update({
        where: { userId: order.freelancerId },
        data: {
          avgRating: agg._avg.rating ?? 0,
          reviewsCount: agg._count.id,
        },
      })

      // Recalc Gig.avgRating (якщо replating)
      if (order.gigId) {
        const gigAgg = await tx.review.aggregate({
          where: {
            gigId: order.gigId,
            direction: 'CLIENT_TO_FREELANCER' as any,
          },
          _avg: { rating: true },
          _count: { id: true },
        })

        await tx.gig.update({
          where: { id: order.gigId },
          data: {
            avgRating: gigAgg._avg.rating ?? 0,
            reviewsCount: gigAgg._count.id,
          },
        })
      }
    } else {
      // FREELANCER_TO_CLIENT — recalc клієнта
      const agg = await tx.review.aggregate({
        where: {
          direction: 'FREELANCER_TO_CLIENT' as any,
          order: { clientId: order.clientId },
        },
        _avg: { rating: true },
        _count: { id: true },
      })

      await tx.user.update({
        where: { id: order.clientId },
        data: {
          clientAvgRating: agg._avg.rating ?? 0,
          clientReviewsCount: agg._count.id,
        },
      })
    }

    return created
  })

  // ─── Поза транзакцією: сповіщення отримувачу (fail-soft) ───
  try {
    await Notify.reviewReceived(recipientId, order.id)
  } catch (err) {
    console.error('[review:create] notification error', err)
  }

  return json({ review }, { status: 201 })
}
