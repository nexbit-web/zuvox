// src/routes/jobs/[id]/+page.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { error } from '@sveltejs/kit'
import { ensureWallet } from '$lib/server/wallet'
import { getLeadFee } from '$lib/server/pricing'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  const userId = session?.user.id

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          city: true,
          verificationStatus: true,
          createdAt: true,
        },
      },
    },
  })

  if (!job) throw error(404, 'Заявку не знайдено')

  const isOwner = userId === job.clientId

  // Доступ для не-OPEN
  if (job.status !== 'OPEN' && !isOwner) {
    if (!userId) throw error(404, 'Заявку не знайдено')
    const myProposal = await prisma.proposal.findUnique({
      where: { jobId_freelancerId: { jobId: job.id, freelancerId: userId } },
      select: { id: true },
    })
    if (!myProposal) throw error(404, 'Заявку не знайдено')
  }

  // viewsCount без блокування
  if (!isOwner && job.status === 'OPEN') {
    prisma.job
      .update({ where: { id: job.id }, data: { viewsCount: { increment: 1 } } })
      .catch(() => {})
  }

  // ─── Owner — показуємо всі proposals ───
  let proposals: any[] = []
  let myProposal: any = null
  let userRole: string | null = null
  let walletBalanceCents = 0
  let leadFeeCents = 0

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
                languages: true,
              },
            },
          },
        },
      },
    })
  } else if (userId) {
    // Фрилансер дивиться чужий job
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    userRole = me?.role ?? null

    myProposal = await prisma.proposal.findUnique({
      where: { jobId_freelancerId: { jobId: job.id, freelancerId: userId } },
    })

    // Якщо фрилансер ще не відгукнувся — показуємо баланс
    if (!myProposal && me?.role === 'FREELANCER') {
      const wallet = await ensureWallet(userId)
      walletBalanceCents = wallet.balanceCents
      leadFeeCents = getLeadFee(job.category)
    }
  }

  return {
    job: {
      ...job,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      expiresAt: job.expiresAt.toISOString(),
      closedAt: job.closedAt?.toISOString() ?? null,
      deadlineAt: job.deadlineAt?.toISOString() ?? null,
      client: {
        ...job.client,
        createdAt: job.client.createdAt.toISOString(),
      },
    },
    isOwner,
    isAuthenticated: !!session,
    userRole,
    proposals: proposals.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      withdrawnAt: p.withdrawnAt?.toISOString() ?? null,
    })),
    myProposal: myProposal
      ? {
          ...myProposal,
          createdAt: myProposal.createdAt.toISOString(),
          updatedAt: myProposal.updatedAt.toISOString(),
          withdrawnAt: myProposal.withdrawnAt?.toISOString() ?? null,
        }
      : null,
    walletBalanceCents,
    leadFeeCents,
  }
}
