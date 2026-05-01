// src/routes/jobs/+page.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { Money } from '$lib/server/wallet'
import type { PageServerLoad } from './$types'

const PAGE_SIZE = 20

export const load: PageServerLoad = async ({ url, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })

  const category = url.searchParams.get('category') ?? ''
  const q = url.searchParams.get('q')?.trim() ?? ''
  const type = url.searchParams.get('type') ?? ''
  const city = url.searchParams.get('city') ?? ''
  const budgetMin = url.searchParams.get('budgetMin') ?? ''
  const budgetMax = url.searchParams.get('budgetMax') ?? ''
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
  const sort = url.searchParams.get('sort') ?? 'recent'

  const where: any = {
    AND: [
      { status: 'OPEN' },
      { expiresAt: { gt: new Date() } },
      category ? { category } : {},
      type && type !== 'ANY' ? { type } : {},
      city ? { city: { contains: city, mode: 'insensitive' } } : {},
      budgetMin
        ? {
            OR: [
              { budgetMaxCents: { gte: Money.toCents(Number(budgetMin)) } },
              { budgetType: 'NEGOTIABLE' },
            ],
          }
        : {},
      budgetMax
        ? {
            OR: [
              { budgetMinCents: { lte: Money.toCents(Number(budgetMax)) } },
              { budgetMaxCents: { lte: Money.toCents(Number(budgetMax)) } },
              { budgetType: 'NEGOTIABLE' },
            ],
          }
        : {},
      q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { tags: { has: q.toLowerCase() } },
            ],
          }
        : {},
    ],
  }

  const orderBy =
    sort === 'budget-desc'
      ? [{ budgetMaxCents: 'desc' as const }]
      : sort === 'budget-asc'
        ? [{ budgetMaxCents: 'asc' as const }]
        : sort === 'popular'
          ? [{ proposalsCount: 'desc' as const }]
          : [{ createdAt: 'desc' as const }]

  const [items, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
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
        deliveryDays: true,
        type: true,
        city: true,
        proposalsCount: true,
        createdAt: true,
        expiresAt: true,
        client: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
    }),
    prisma.job.count({ where }),
  ])

  // Trim long descriptions
  const trimmed = items.map((j) => ({
    ...j,
    description:
      j.description.length > 250
        ? j.description.slice(0, 250) + '…'
        : j.description,
    createdAt: j.createdAt.toISOString(),
    expiresAt: j.expiresAt.toISOString(),
  }))

  return {
    items: trimmed,
    total,
    page,
    hasMore: page * PAGE_SIZE < total,
    filters: { category, q, type, city, budgetMin, budgetMax, sort },
    isAuthenticated: !!session,
  }
}
