// src/routes/api/reviews/+server.ts
import { json, error } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { limit } from '$lib/rate-limit'
import type { RequestHandler } from './$types'

/**
 * POST /api/reviews
 *
 * Body: { orderId, rating: 1-5, comment?: string }
 *
 * Тільки клієнт може залишити відгук про фрілансера після того як
 * замовлення COMPLETED. Один відгук на замовлення (унікальність orderId).
 *
 * Атомарно:
 *   1. Створює Review
 *   2. Перераховує avgRating, reviewsCount у FreelancerProfile
 *   3. Перераховує avgRating у Gig (якщо order.gigId)
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
      review: { select: { id: true } },
    },
  })

  if (!order) throw error(404, 'Замовлення не знайдено')
  if (order.clientId !== session.user.id) {
    throw error(403, 'Тільки клієнт залишає відгук')
  }
  if (order.status !== 'COMPLETED') {
    throw error(400, 'Відгук можна залишити тільки після завершення')
  }
  if (order.review) {
    throw error(400, 'Ви вже залишили відгук')
  }

  // ─── Атомарне створення review + recalc метрик ───
  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        rating,
        comment,
        orderId: order.id,
        gigId: order.gigId, // null якщо це Direct або Job-order
        authorId: session.user.id,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    })

    // ─── Recalc FreelancerProfile.avgRating ───
    const agg = await tx.review.aggregate({
      where: {
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

    // ─── Recalc Gig.avgRating (якщо replating) ───
    if (order.gigId) {
      const gigAgg = await tx.review.aggregate({
        where: { gigId: order.gigId },
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

    return created
  })

  return json({ review }, { status: 201 })
}
