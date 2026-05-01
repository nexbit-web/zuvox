// src/routes/(auth)/dashboard/wallet/+page.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { redirect, error } from '@sveltejs/kit'
import { ensureWallet } from '$lib/server/wallet'
import type { PageServerLoad } from './$types'

const PAGE_SIZE = 20

export interface WalletPageData {
  wallet: {
    balanceCents: number
    heldCents: number
    currency: string
  }
  transactions: Array<{
    id: string
    amountCents: number
    type: string
    description: string | null
    orderId: string | null
    proposalId: string | null
    status: string
    createdAt: string
  }>
  nextCursor: string | null
  isFreelancer: boolean
}

export const load: PageServerLoad = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw redirect(302, '/user/login?next=/dashboard/wallet')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (!user) throw error(404, 'User not found')

  const wallet = await ensureWallet(session.user.id)

  const transactions = await prisma.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      amountCents: true,
      type: true,
      description: true,
      orderId: true,
      proposalId: true,
      status: true,
      createdAt: true,
    },
  })

  const hasMore = transactions.length > PAGE_SIZE
  const items = hasMore ? transactions.slice(0, PAGE_SIZE) : transactions
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return {
    wallet: {
      balanceCents: wallet.balanceCents,
      heldCents: wallet.heldCents,
      currency: wallet.currency,
    },
    transactions: items.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    })),
    nextCursor,
    isFreelancer: user.role === 'FREELANCER',
  } satisfies WalletPageData
}
