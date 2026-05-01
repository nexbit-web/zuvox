// src/routes/(auth)/dashboard/jobs/+page.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw redirect(302, '/user/login?next=/dashboard/jobs')

  const jobs = await prisma.job.findMany({
    where: { clientId: session.user.id },
    orderBy: [
      { status: 'asc' }, // OPEN перший
      { updatedAt: 'desc' },
    ],
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      subcategory: true,
      tags: true,
      budgetType: true,
      budgetMinCents: true,
      budgetMaxCents: true,
      currency: true,
      type: true,
      city: true,
      status: true,
      proposalsCount: true,
      createdAt: true,
      expiresAt: true,
      closedAt: true,
    },
  })

  const counts = {
    open: jobs.filter((j) => j.status === 'OPEN').length,
    closed: jobs.filter((j) => j.status === 'CLOSED').length,
    cancelled: jobs.filter(
      (j) => j.status === 'CANCELLED' || j.status === 'EXPIRED',
    ).length,
  }

  return {
    jobs: jobs.map((j) => ({
      ...j,
      createdAt: j.createdAt.toISOString(),
      expiresAt: j.expiresAt.toISOString(),
      closedAt: j.closedAt?.toISOString() ?? null,
    })),
    counts,
  }
}
