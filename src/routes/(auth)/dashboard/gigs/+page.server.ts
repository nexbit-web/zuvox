// src/routes/(auth)/dashboard/gigs/+page.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { redirect, error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw redirect(302, '/user/login?next=/dashboard/gigs')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, verificationStatus: true },
  })
  if (!user) throw error(404, 'User not found')
  if (user.role !== 'FREELANCER') {
    throw redirect(302, '/dashboard')
  }

  const gigs = await prisma.gig.findMany({
    where: {
      sellerId: session.user.id,
      status: { not: 'ARCHIVED' },
    },
    orderBy: [
      { status: 'asc' }, // ACTIVE → DRAFT → PAUSED
      { updatedAt: 'desc' },
    ],
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      images: true,
      status: true,
      avgRating: true,
      reviewsCount: true,
      ordersCount: true,
      viewCount: true,
      createdAt: true,
      updatedAt: true,
      packages: {
        orderBy: { priceCents: 'asc' },
        select: {
          tier: true,
          priceCents: true,
          deliveryDays: true,
        },
      },
    },
  })

  // Counters by status
  const counts = {
    active: gigs.filter((g) => g.status === 'ACTIVE').length,
    draft: gigs.filter((g) => g.status === 'DRAFT').length,
    paused: gigs.filter((g) => g.status === 'PAUSED').length,
  }

  return {
    gigs: gigs.map((g) => ({
      ...g,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    })),
    counts,
    isVerified: user.verificationStatus === 'VERIFIED',
  }
}
