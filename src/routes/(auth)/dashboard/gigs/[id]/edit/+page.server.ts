// src/routes/(auth)/dashboard/gigs/[id]/edit/+page.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { redirect, error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    throw redirect(
      302,
      `/user/login?next=${encodeURIComponent(`/dashboard/gigs/${params.id}/edit`)}`,
    )
  }

  const gig = await prisma.gig.findUnique({
    where: { id: params.id },
    include: {
      packages: {
        orderBy: { priceCents: 'asc' },
      },
    },
  })

  if (!gig) throw error(404, 'Не знайдено')
  if (gig.sellerId !== session.user.id) throw error(403, 'Не ваш гіг')
  if (gig.status === 'ARCHIVED') {
    throw error(400, 'Архівований гіг не редагується')
  }

  return {
    gig: {
      id: gig.id,
      title: gig.title,
      description: gig.description,
      shortDescription: gig.shortDescription,
      category: gig.category,
      subcategory: gig.subcategory,
      tags: gig.tags,
      images: gig.images,
      imagesPublicIds: gig.imagesPublicIds,
      status: gig.status,
      packages: gig.packages.map((p) => ({
        tier: p.tier,
        name: p.name,
        description: p.description,
        priceCents: p.priceCents,
        deliveryDays: p.deliveryDays,
        revisions: p.revisions,
        features: p.features,
      })),
    },
  }
}
