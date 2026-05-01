// src/routes/api/wallet/+server.ts
import { json, error } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { ensureWallet } from '$lib/server/wallet'
import type { RequestHandler } from './$types'

/**
 * GET /api/wallet
 *
 * Параметри:
 *   ?cursor=<id>      — для пагінації (ID останньої побаченої транзакції)
 *   ?limit=20         — скільки транзакцій повернути (max 50)
 *   ?type=LEAD_FEE    — фільтр за типом (опційно)
 *
 * Завжди гарантує наявність Wallet (створює якщо немає).
 */
export const GET: RequestHandler = async ({ request, url }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  const cursor = url.searchParams.get('cursor')
  const limit = Math.min(
    50,
    Math.max(1, Number(url.searchParams.get('limit') ?? 20)),
  )
  const typeFilter = url.searchParams.get('type')

  const wallet = await ensureWallet(session.user.id)

  // Список транзакцій
  const transactions = await prisma.walletTransaction.findMany({
    where: {
      walletId: wallet.id,
      ...(typeFilter ? { type: typeFilter as any } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
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

  const hasMore = transactions.length > limit
  const items = hasMore ? transactions.slice(0, limit) : transactions
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return json({
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
  })
}
