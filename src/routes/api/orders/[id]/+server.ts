// src/routes/api/orders/[id]/+server.ts
import { json, error } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import type { RequestHandler } from './$types'

/**
 * GET /api/orders/[id] — отримати деталі замовлення.
 * Доступ — тільки учасники.
 */
export const GET: RequestHandler = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      client: {
        select: { id: true, name: true, username: true, avatar: true },
      },
      freelancer: {
        select: { id: true, name: true, username: true, avatar: true },
      },
      gig: {
        select: { id: true, title: true },
      },
      events: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          type: true,
          actorId: true,
          payload: true,
          createdAt: true,
        },
      },
    },
  })

  if (!order) throw error(404, 'Замовлення не знайдено')

  // Доступ — тільки учасники
  const userId = session.user.id
  if (order.clientId !== userId && order.freelancerId !== userId) {
    throw error(403, 'Доступ заборонено')
  }

  return json({ order })
}
