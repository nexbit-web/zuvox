// src/routes/(auth)/orders/+page.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ request, url }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw redirect(302, '/user/login?next=/orders')

  const userId = session.user.id
  const role = url.searchParams.get('role') ?? 'all' // 'client' | 'freelancer' | 'all'

  const where = {
    AND: [
      role === 'client'
        ? { clientId: userId }
        : role === 'freelancer'
          ? { freelancerId: userId }
          : { OR: [{ clientId: userId }, { freelancerId: userId }] },
    ],
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      priceCents: true,
      currency: true,
      status: true,
      source: true,
      createdAt: true,
      updatedAt: true,
      deadlineAt: true,
      clientId: true,
      freelancerId: true,
      client: {
        select: { id: true, name: true, username: true, avatar: true },
      },
      freelancer: {
        select: { id: true, name: true, username: true, avatar: true },
      },
    },
    take: 200,
  })

  // Counters
  const counts = {
    active: orders.filter((o) =>
      ['NEGOTIATING', 'ACCEPTED', 'DELIVERED'].includes(o.status),
    ).length,
    completed: orders.filter((o) => o.status === 'COMPLETED').length,
    cancelled: orders.filter(
      (o) => o.status === 'CANCELLED' || o.status === 'DISPUTED',
    ).length,
  }

  return {
    orders: orders.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      deadlineAt: o.deadlineAt?.toISOString() ?? null,
    })),
    counts,
    viewerId: userId,
    roleFilter: role,
  }
}
