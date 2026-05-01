// src/routes/gigs/[slug]/+page.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })

  const gig = await prisma.gig.findFirst({
    where: {
      OR: [{ slug: params.slug }, { id: params.slug }],
    },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          bio: true,
          city: true,
          verificationStatus: true,
          createdAt: true,
          freelancerProfile: {
            select: {
              avgRating: true,
              reviewsCount: true,
              completedOrders: true,
              responseTimeHrs: true,
              languages: true,
              experience: true,
            },
          },
        },
      },
      packages: {
        orderBy: { priceCents: 'asc' },
      },
    },
  })

  if (!gig) throw error(404, 'Послугу не знайдено')

  const isOwner = session?.user.id === gig.sellerId

  // Доступ: ACTIVE — всі. Інші статуси — тільки автор.
  if (gig.status !== 'ACTIVE' && !isOwner) {
    throw error(404, 'Послугу не знайдено')
  }

  // viewCount — без блокування
  if (!isOwner && gig.status === 'ACTIVE') {
    prisma.gig
      .update({
        where: { id: gig.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => {})
  }

  return {
    gig: {
      id: gig.id,
      slug: gig.slug,
      title: gig.title,
      description: gig.description,
      shortDescription: gig.shortDescription,
      category: gig.category,
      subcategory: gig.subcategory,
      tags: gig.tags,
      images: gig.images,
      videoUrl: gig.videoUrl,
      status: gig.status,
      viewCount: gig.viewCount,
      ordersCount: gig.ordersCount,
      avgRating: gig.avgRating,
      reviewsCount: gig.reviewsCount,
      createdAt: gig.createdAt.toISOString(),
      seller: gig.seller,
      packages: gig.packages.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    },
    isOwner,
    isAuthenticated: !!session,
  }
}
