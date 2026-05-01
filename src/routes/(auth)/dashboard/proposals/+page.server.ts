// src/routes/(auth)/dashboard/proposals/+page.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw redirect(302, '/user/login?next=/dashboard/proposals')

  const proposals = await prisma.proposal.findMany({
    where: { freelancerId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          budgetType: true,
          budgetMinCents: true,
          budgetMaxCents: true,
          currency: true,
          client: {
            select: {
              id: true,
              name: true,
              avatar: true,
              username: true,
            },
          },
        },
      },
    },
  })

  const counts = {
    submitted: proposals.filter((p) => p.status === 'SUBMITTED').length,
    accepted: proposals.filter((p) => p.status === 'ACCEPTED').length,
    rejected: proposals.filter((p) => p.status === 'REJECTED').length,
    withdrawn: proposals.filter((p) => p.status === 'WITHDRAWN').length,
  }

  // Сума витрачених лідів
  const totalLeadFeeCents = proposals.reduce(
    (sum, p) => sum + p.leadFeeCents,
    0,
  )

  return {
    proposals: proposals.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      withdrawnAt: p.withdrawnAt?.toISOString() ?? null,
    })),
    counts,
    totalLeadFeeCents,
  }
}
